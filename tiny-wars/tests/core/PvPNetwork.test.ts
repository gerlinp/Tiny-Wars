import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PvPNetwork } from '@core/PvPNetwork'

// PeerJS is browser/WebRTC-only — stub it so PvPNetwork can be instantiated in Node
vi.mock('peerjs', () => ({
  Peer: class {
    on() {}
    connect() { return { on() {} } }
    destroy() {}
  },
}))

/** Minimal stand-in for a PeerJS DataConnection. */
function makeMockConn() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
  const sent: unknown[] = []
  return {
    on(event: string, fn: (...args: unknown[]) => void) {
      ;(handlers[event] ??= []).push(fn)
    },
    send(data: unknown) { sent.push(data) },
    /** Fire a registered event handler (test helper). */
    emit(event: string, ...args: unknown[]) {
      handlers[event]?.forEach(fn => fn(...args))
    },
    sent,
  }
}

function makeNet(): PvPNetwork {
  return new PvPNetwork()
}

/** Wire conn into the network and call the private setupConn. */
function wire(net: PvPNetwork, conn: ReturnType<typeof makeMockConn>) {
  ;(net as unknown as Record<string, unknown>).conn = conn
  ;(net as unknown as { setupConn: (c: unknown) => void }).setupConn(conn)
}

describe('PvPNetwork — HELLO handshake', () => {
  let net: PvPNetwork
  let conn: ReturnType<typeof makeMockConn>

  beforeEach(() => {
    net  = makeNet()
    conn = makeMockConn()
    wire(net, conn)
  })

  it('sends HELLO with localName when the connection opens', () => {
    net.localName = 'Alice'
    conn.emit('open')
    expect(conn.sent[0]).toEqual({ type: 'HELLO', name: 'Alice' })
  })

  it('sends HELLO with an empty string when no name is set', () => {
    conn.emit('open')
    expect(conn.sent[0]).toEqual({ type: 'HELLO', name: '' })
  })

  it('fires onConnected after sending HELLO', () => {
    const onConnected = vi.fn()
    net.onConnected = onConnected
    conn.emit('open')
    expect(conn.sent[0]).toEqual({ type: 'HELLO', name: '' })
    expect(onConnected).toHaveBeenCalledOnce()
  })

  it('stores opponentName when a HELLO message is received', () => {
    conn.emit('data', { type: 'HELLO', name: 'Bob' })
    expect(net.opponentName).toBe('Bob')
  })

  it('fires onOpponentName with the received name', () => {
    const onOpponentName = vi.fn()
    net.onOpponentName = onOpponentName
    conn.emit('data', { type: 'HELLO', name: 'Bob' })
    expect(onOpponentName).toHaveBeenCalledWith('Bob')
  })

  it('stores opponentName even when onOpponentName is not yet registered', () => {
    // Regression: HELLO can arrive during the loading screen before BattleScene
    // sets up net.onOpponentName. The name must still be available on the object
    // so BattleScene can read net.opponentName when it eventually starts.
    expect(net.onOpponentName).toBeNull()
    conn.emit('data', { type: 'HELLO', name: 'EarlyArrival' })
    expect(net.opponentName).toBe('EarlyArrival')
  })
})

describe('PvPNetwork — existing message handling is unaffected', () => {
  let net: PvPNetwork
  let conn: ReturnType<typeof makeMockConn>

  beforeEach(() => {
    net  = makeNet()
    conn = makeMockConn()
    wire(net, conn)
  })

  it('fires onDeploy for DEPLOY messages', () => {
    const onDeploy = vi.fn()
    net.onDeploy = onDeploy
    conn.emit('data', { type: 'DEPLOY', cardId: 'lancer', gridPos: { x: 3, y: 10 } })
    expect(onDeploy).toHaveBeenCalledWith('lancer', { x: 3, y: 10 }, undefined)
  })

  it('forwards the precise world position when present', () => {
    const onDeploy = vi.fn()
    net.onDeploy = onDeploy
    conn.emit('data', {
      type: 'DEPLOY',
      cardId: 'lancer',
      gridPos: { x: 3, y: 10 },
      pos: { x: 224, y: 672 },
    })
    expect(onDeploy).toHaveBeenCalledWith('lancer', { x: 3, y: 10 }, { x: 224, y: 672 })
  })

  it('fires onRematch for REMATCH messages', () => {
    const onRematch = vi.fn()
    net.onRematch = onRematch
    conn.emit('data', { type: 'REMATCH' })
    expect(onRematch).toHaveBeenCalledOnce()
  })

  it('fires onDisconnected when the connection closes', () => {
    const onDisconnected = vi.fn()
    net.onDisconnected = onDisconnected
    conn.emit('close')
    expect(onDisconnected).toHaveBeenCalledOnce()
  })
})
