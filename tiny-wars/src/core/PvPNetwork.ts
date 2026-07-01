import { Peer, type DataConnection } from 'peerjs'
import type { Vec2 } from './types'

export type PvPMessage =
  | { type: 'READY' }
  | { type: 'DEPLOY'; cardId: string; gridPos: Vec2; pos?: Vec2 }
  | { type: 'REMATCH' }
  | { type: 'HELLO'; name: string }

export type PvPRole = 'HOST' | 'GUEST'

// Unambiguous alphanumeric chars — no O/0/I/1 confusion
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LEN   = 5
const PEER_PREFIX = 'tinywars-'

// Matchmaking pool — public slots anyone can host or scan
const MM_PREFIX   = 'tinywars-mm-'
const MM_SLOTS    = 5
const MM_HOST_TTL = 18_000 // ms to wait as host before re-scanning

function generateCode(): string {
  return Array.from({ length: CODE_LEN }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('')
}

export class PvPNetwork {
  private peer: Peer
  private conn: DataConnection | null = null

  role: PvPRole = 'HOST'
  roomCode = ''
  localName = ''
  opponentName = ''

  onConnected: (() => void) | null = null
  onDeploy: ((cardId: string, gridPos: Vec2, pos?: Vec2) => void) | null = null
  onDisconnected: (() => void) | null = null
  onRematch: (() => void) | null = null
  onOpponentName: ((name: string) => void) | null = null

  private mmAborted = false

  constructor() {
    this.peer = new Peer()
    // Prevent unhandled error throws; real errors surface via Promise rejections
    this.peer.on('error', () => {})
  }

  /** Host: register a short code as the peer ID and wait for a guest. */
  createRoom(): Promise<string> {
    this.role = 'HOST'
    const code = generateCode()
    const peerId = PEER_PREFIX + code

    return new Promise((resolve, reject) => {
      // Destroy the auto-ID peer, re-create with our chosen ID
      this.peer.destroy()
      this.peer = new Peer(peerId)

      this.peer.on('open', () => {
        this.roomCode = code
        resolve(code)
      })
      this.peer.on('error', err => {
        // ID taken — try a new code
        if ((err as { type?: string }).type === 'unavailable-id') {
          this.peer.destroy()
          this.peer = new Peer(PEER_PREFIX + generateCode())
          this.peer.on('open', () => {
            this.roomCode = this.peer.id.replace(PEER_PREFIX, '')
            resolve(this.roomCode)
          })
          this.peer.on('error', reject)
          this.peer.on('connection', conn => {
            this.conn = conn
            this.setupConn(conn)
          })
        } else {
          reject(err)
        }
      })
      this.peer.on('connection', conn => {
        this.conn = conn
        this.setupConn(conn)
      })
    })
  }

  /** Guest: join using the 5-char code shown on the host's screen. */
  joinRoom(code: string): Promise<void> {
    this.role = 'GUEST'
    this.roomCode = code.toUpperCase().trim()
    const peerId = PEER_PREFIX + this.roomCode

    return new Promise((resolve, reject) => {
      this.peer.on('open', () => {
        const conn = this.peer.connect(peerId)
        this.conn = conn
        this.setupConn(conn)
        conn.on('open', () => resolve())
        conn.on('error', reject)
      })
      this.peer.on('error', reject)
    })
  }

  /**
   * Anonymous matchmaking. Alternates between scanning public slots for an
   * existing host and hosting a random slot ourselves. Calls onStatus with
   * human-readable progress updates. Resolves when a match is found.
   */
  async findMatch(onStatus: (s: string) => void): Promise<void> {
    this.mmAborted = false

    const slotId = (i: number) => `${MM_PREFIX}${i}`

    const swapPeer = (id?: string): void => {
      this.peer.destroy()
      this.peer = id ? new Peer(id) : new Peer()
      this.peer.on('error', () => {})
    }

    const waitOpen = (): Promise<void> =>
      new Promise(resolve => this.peer.on('open', () => resolve()))

    // Try connecting to one slot; resolves null on timeout or unavailable
    const tryConnect = (id: string, ms = 2000): Promise<DataConnection | null> =>
      new Promise(resolve => {
        if (this.mmAborted) return resolve(null)
        let done = false
        const conn = this.peer.connect(id)
        const t = setTimeout(() => {
          if (!done) { done = true; try { conn.close() } catch {} resolve(null) }
        }, ms)
        conn.on('open', () => {
          if (!done) { done = true; clearTimeout(t); resolve(conn) }
        })
      })

    while (!this.mmAborted) {
      // ── SCAN PHASE ──────────────────────────────────────────────────────────
      onStatus('Searching for opponents...')
      const scanResults = await Promise.all(
        Array.from({ length: MM_SLOTS }, (_, i) => tryConnect(slotId(i)))
      )
      if (this.mmAborted) {
        scanResults.forEach(c => { try { c?.close() } catch {} })
        return
      }

      const guestConn = scanResults.find(c => c !== null) ?? null
      scanResults.forEach(c => { if (c && c !== guestConn) try { c.close() } catch {} })
      if (guestConn) {
        this.role = 'GUEST'
        this.conn = guestConn
        this.setupConn(guestConn)
        return
      }

      // ── HOST PHASE ──────────────────────────────────────────────────────────
      const myIndex = Math.floor(Math.random() * MM_SLOTS)
      const mySlot  = slotId(myIndex)
      onStatus('Waiting for opponent...')

      let slotTaken = false
      try {
        swapPeer(mySlot)
        await new Promise<void>((resolve, reject) => {
          this.peer.on('open', () => resolve())
          this.peer.on('error', (err: { type?: string }) => {
            if (err.type === 'unavailable-id') { slotTaken = true; resolve() }
            else reject(err)
          })
        })
      } catch {
        // Unexpected network error — reset and retry
        swapPeer(); await waitOpen(); continue
      }

      if (slotTaken) {
        // Someone just claimed this slot — join them
        swapPeer(); await waitOpen()
        if (this.mmAborted) return
        const conn = await tryConnect(mySlot, 5000)
        if (conn) {
          this.role = 'GUEST'; this.conn = conn; this.setupConn(conn); return
        }
        continue
      }

      // ── WAIT PHASE ──────────────────────────────────────────────────────────
      let matched = false
      await new Promise<void>(resolve => {
        const t = setTimeout(resolve, MM_HOST_TTL)
        this.peer.on('connection', (conn: DataConnection) => {
          clearTimeout(t)
          matched = true
          this.role = 'HOST'; this.conn = conn; this.setupConn(conn); resolve()
        })
      })
      if (matched || this.mmAborted) return

      // Timed out with no one joining — reset and scan again
      swapPeer(); await waitOpen()
    }
  }

  cancelFindMatch(): void {
    this.mmAborted = true
  }

  sendDeploy(cardId: string, gridPos: Vec2, pos?: Vec2): void {
    this.send({ type: 'DEPLOY', cardId, gridPos, pos })
  }

  sendRematch(): void {
    this.send({ type: 'REMATCH' })
  }

  private send(msg: PvPMessage): void {
    this.conn?.send(msg)
  }

  private setupConn(conn: DataConnection): void {
    const onOpen = () => {
      this.send({ type: 'HELLO', name: this.localName })
      this.onConnected?.()
    }
    // The matchmaking guest path resolves tryConnect only after open fires,
    // so the connection may already be open by the time setupConn is called.
    if (conn.open) {
      onOpen()
    } else {
      conn.on('open', onOpen)
    }
    conn.on('data', (raw) => {
      const msg = raw as PvPMessage
      if (msg.type === 'DEPLOY') {
        this.onDeploy?.(msg.cardId, msg.gridPos, msg.pos)
      } else if (msg.type === 'REMATCH') {
        this.onRematch?.()
      } else if (msg.type === 'HELLO') {
        this.opponentName = msg.name
        this.onOpponentName?.(msg.name)
      }
    })
    conn.on('close', () => {
      this.onDisconnected?.()
    })
  }

  destroy(): void {
    this.mmAborted = true
    this.conn?.close()
    this.peer.destroy()
  }
}
