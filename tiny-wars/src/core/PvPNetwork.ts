import { Peer, type DataConnection } from 'peerjs'
import type { Vec2 } from './types'

export type PvPMessage =
  | { type: 'READY' }
  | { type: 'DEPLOY'; cardId: string; gridPos: Vec2 }
  | { type: 'REMATCH' }

export type PvPRole = 'HOST' | 'GUEST'

// Unambiguous alphanumeric chars — no O/0/I/1 confusion
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LEN   = 5
const PEER_PREFIX = 'tinywars-'

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

  onConnected: (() => void) | null = null
  onDeploy: ((cardId: string, gridPos: Vec2) => void) | null = null
  onDisconnected: (() => void) | null = null
  onRematch: (() => void) | null = null

  constructor() {
    this.peer = new Peer()
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

  sendDeploy(cardId: string, gridPos: Vec2): void {
    this.send({ type: 'DEPLOY', cardId, gridPos })
  }

  sendRematch(): void {
    this.send({ type: 'REMATCH' })
  }

  private send(msg: PvPMessage): void {
    this.conn?.send(msg)
  }

  private setupConn(conn: DataConnection): void {
    conn.on('open', () => {
      this.onConnected?.()
    })
    conn.on('data', (raw) => {
      const msg = raw as PvPMessage
      if (msg.type === 'DEPLOY') {
        this.onDeploy?.(msg.cardId, msg.gridPos)
      } else if (msg.type === 'REMATCH') {
        this.onRematch?.()
      }
    })
    conn.on('close', () => {
      this.onDisconnected?.()
    })
  }

  destroy(): void {
    this.conn?.close()
    this.peer.destroy()
  }
}
