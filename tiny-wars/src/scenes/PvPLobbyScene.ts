import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { PvPNetwork } from '@core/PvPNetwork'

const BODY_FONT = "'Philosopher', Georgia, serif"

type LobbyState = 'MENU' | 'CREATING' | 'WAITING_FOR_GUEST' | 'JOINING' | 'CONNECTING'

/**
 * Stacks items top-to-bottom like CSS flex-direction:column.
 * Returns the centre Y of each item relative to startY.
 */
function flexColumn(heights: number[], gap: number, startY = 0): number[] {
  const centres: number[] = []
  let y = startY
  for (const h of heights) {
    centres.push(y + h / 2)
    y += h + gap
  }
  return centres
}

const BTN_H   = 64   // pixel height of a scale-2 button sprite
const INPUT_H = 42
const NAME_H  = 36

export class PvPLobbyScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text
  private codeText!: Phaser.GameObjects.Text
  private copyHint!: Phaser.GameObjects.Text
  private waitingText!: Phaser.GameObjects.Text

  private menuContainer!: Phaser.GameObjects.Container
  private joinContainer!: Phaser.GameObjects.Container
  private waitingContainer!: Phaser.GameObjects.Container

  private lobbyState: LobbyState = 'MENU'
  private network: PvPNetwork | null = null
  private dotTimer: Phaser.Time.TimerEvent | null = null
  private dotCount = 0
  private domInput: HTMLInputElement | null = null   // room code input
  private nameInput: HTMLInputElement | null = null  // player name input

  constructor() {
    super({ key: 'PvPLobbyScene' })
  }

  create(): void {
    const { width, height } = this.scale
    this.lobbyState = 'MENU'

    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0)

    // Title — fixed at the top
    this.add.text(width / 2, height * 0.10, 'ONLINE BATTLE', {
      fontSize: '34px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#332200',
      strokeThickness: 6,
    }).setOrigin(0.5)

    // Name section label (always visible except during WAITING state)
    this.add.text(width / 2, height * 0.20, 'YOUR NAME (optional)', {
      fontSize: '13px',
      fontFamily: BODY_FONT,
      color: '#556688',
    }).setOrigin(0.5)

    // Status line
    this.statusText = this.add.text(width / 2, height * 0.36, '', {
      fontSize: '16px',
      fontFamily: BODY_FONT,
      color: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5)

    this.buildMenuContainer(width, height)
    this.buildJoinContainer(width, height)
    this.buildWaitingContainer(width, height)

    this.joinContainer.setVisible(false)
    this.waitingContainer.setVisible(false)

    const rect = this.scale.canvas.getBoundingClientRect()
    const sx = rect.width / width
    const sy = rect.height / height

    // ── Name DOM input ──────────────────────────────────────────────────────
    const ni = document.createElement('input')
    ni.type = 'text'
    ni.maxLength = 14
    ni.placeholder = 'e.g. DragonSlayer'
    ni.autocomplete = 'off'
    ni.setAttribute('enterkeyhint', 'done')
    ni.style.cssText = [
      'position:fixed',
      'box-sizing:border-box',
      'background:#0d1a2a',
      'border:1px solid #334466',
      'border-radius:4px',
      'color:#aaccee',
      'font-family:monospace',
      'text-align:center',
      'outline:none',
      'z-index:10',
      'padding:0',
    ].join(';')
    document.body.appendChild(ni)
    this.nameInput = ni

    const nameInputPhaserY = height * 0.26
    const niScreenX = rect.left + (width / 2) * sx
    const niScreenY = rect.top + nameInputPhaserY * sy
    const niW = 180 * sx
    const niH = NAME_H * sy
    ni.style.left     = `${niScreenX - niW / 2}px`
    ni.style.top      = `${niScreenY - niH / 2}px`
    ni.style.width    = `${niW}px`
    ni.style.height   = `${niH}px`
    ni.style.fontSize = `${14 * sy}px`

    // ── Room-code DOM input ─────────────────────────────────────────────────
    const di = document.createElement('input')
    di.type = 'text'
    di.maxLength = 5
    di.autocomplete = 'off'
    di.autocapitalize = 'characters'
    di.setAttribute('inputmode', 'text')
    di.setAttribute('enterkeyhint', 'go')
    di.style.cssText = [
      'position:fixed',
      'display:none',
      'box-sizing:border-box',
      'background:#112233',
      'border:2px solid #4466aa',
      'color:#88ffcc',
      'font-family:monospace',
      'font-weight:bold',
      'text-align:center',
      'text-transform:uppercase',
      'letter-spacing:0.15em',
      'outline:none',
      'z-index:10',
      'padding:0',
    ].join(';')
    document.body.appendChild(di)
    this.domInput = di

    const [inputY] = flexColumn([INPUT_H, BTN_H, BTN_H], 48)
    const diScreenX = rect.left + (width / 2) * sx
    const diScreenY = rect.top + (height * 0.46 + inputY) * sy
    const diW = 200 * sx
    const diH = INPUT_H * sy
    di.style.left     = `${diScreenX - diW / 2}px`
    di.style.top      = `${diScreenY - diH / 2}px`
    di.style.width    = `${diW}px`
    di.style.height   = `${diH}px`
    di.style.fontSize = `${22 * sy}px`

    di.addEventListener('input', () => {
      di.value = di.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    })
    di.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); this.onJoinRoom() }
    })

    this.events.once('shutdown', () => {
      ni.remove()
      di.remove()
      this.nameInput = null
      this.domInput = null
    })
  }

  // ---------------------------------------------------------------------------
  // Panel builders
  // ---------------------------------------------------------------------------

  private buildMenuContainer(width: number, height: number): void {
    const gap    = 16
    const btnW   = 128
    const pairW  = btnW * 2 + gap
    const leftX  = -pairW / 2 + btnW / 2
    const rightX = pairW  / 2 - btnW / 2

    const [rowY, backY] = flexColumn([BTN_H, BTN_H], 40)

    const createBtn = this.makeBtn(leftX,  rowY,  'CREATE', '15px', () => this.onCreateRoom())
    const joinBtn   = this.makeBtn(rightX, rowY,  'JOIN',   '15px', () => this.showJoinInput())
    const backBtn   = this.makeBtn(0,      backY, 'BACK',   '13px', () => this.goBack())

    this.menuContainer = this.add.container(width / 2, height * 0.52, [
      ...createBtn, ...joinBtn, ...backBtn,
    ])
  }

  private buildJoinContainer(width: number, height: number): void {
    const [inputY, connectY, backY] = flexColumn([INPUT_H, BTN_H, BTN_H], 48)

    const label = this.add.text(0, inputY - INPUT_H / 2 - 18, 'ROOM CODE', {
      fontSize: '16px',
      fontFamily: BODY_FONT,
      color: '#6677bb',
    }).setOrigin(0.5)

    const connectBtn = this.makeBtn(0, connectY, 'CONNECT', '14px', () => this.onJoinRoom())
    const backBtn    = this.makeBtn(0, backY,    'BACK',    '13px', () => this.goBack())

    this.joinContainer = this.add.container(width / 2, height * 0.46, [
      label, ...connectBtn, ...backBtn,
    ])
  }

  private buildWaitingContainer(width: number, height: number): void {
    const CODE_BOX_H = 70
    const HINT_H     = 20

    const [codeY, , shareY, waitY, backY] =
      flexColumn([CODE_BOX_H, HINT_H, BTN_H, 20, BTN_H], 24)

    const codeBox = this.add.rectangle(0, codeY, 300, CODE_BOX_H, 0x112233)
      .setStrokeStyle(2, 0x44aaff)
      .setInteractive({ useHandCursor: true })

    this.codeText = this.add.text(0, codeY - 10, '', {
      fontSize: '15px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#88ffcc',
    }).setOrigin(0.5)

    this.copyHint = this.add.text(0, codeY + 18, 'TAP TO COPY', {
      fontSize: '13px',
      fontFamily: BODY_FONT,
      color: '#4477aa',
    }).setOrigin(0.5)

    codeBox.on('pointerdown', () => this.copyCode())
    codeBox.on('pointerover', () => {
      codeBox.setStrokeStyle(2, 0x88ddff)
      this.copyHint.setColor('#88bbff')
    })
    codeBox.on('pointerout', () => {
      codeBox.setStrokeStyle(2, 0x44aaff)
      this.copyHint.setColor('#4477aa')
    })
    this.codeText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.copyCode())

    const shareBtn = this.makeBtn(0, shareY, 'SHARE', '14px', () => this.shareCode())

    this.waitingText = this.add.text(0, waitY, '', {
      fontSize: '16px',
      fontFamily: BODY_FONT,
      color: '#aabbff',
      align: 'center',
    }).setOrigin(0.5)

    const backBtn = this.makeBtn(0, backY, 'BACK', '13px', () => this.goBack())

    this.waitingContainer = this.add.container(width / 2, height * 0.30, [
      codeBox, this.codeText, this.copyHint,
      ...shareBtn, this.waitingText, ...backBtn,
    ])
  }

  // ---------------------------------------------------------------------------
  // Button factory
  // ---------------------------------------------------------------------------

  private makeBtn(
    x: number, y: number,
    label: string, fontSize: string,
    onPress: () => void,
  ): Phaser.GameObjects.GameObject[] {
    const img = this.add.image(x, y, 'button_blue')
      .setInteractive({ useHandCursor: true })
      .setScale(2)
    const txt = this.add.text(x, y, label, {
      fontSize,
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000022',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1)
    img.on('pointerdown', onPress)
    img.on('pointerover', () => img.setTint(0xdddddd))
    img.on('pointerout', () => img.clearTint())
    return [img, txt]
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  private getLocalName(): string {
    return (this.nameInput?.value ?? '').trim().slice(0, 14)
  }

  private showJoinInput(): void {
    this.lobbyState = 'JOINING'
    if (this.domInput) { this.domInput.value = ''; this.domInput.style.display = 'block'; this.domInput.focus() }
    this.menuContainer.setVisible(false)
    this.joinContainer.setVisible(true)
    this.statusText.setText('Enter the room code your opponent shared')
  }

  private async onCreateRoom(): Promise<void> {
    this.lobbyState = 'CREATING'
    this.statusText.setText('Creating room...')
    this.menuContainer.setVisible(false)
    if (this.nameInput) this.nameInput.style.display = 'none'
    this.network = new PvPNetwork()
    this.network.localName = this.getLocalName()
    try {
      const code = await this.network.createRoom()
      this.lobbyState = 'WAITING_FOR_GUEST'
      this.codeText.setText(code)
      this.statusText.setText('Share this code with your opponent')
      this.waitingContainer.setVisible(true)
      this.startWaitingDots()
      this.network.onConnected = () => {
        this.stopWaitingDots()
        this.startBattle()
      }
    } catch {
      this.statusText.setText('Failed to create room. Check your connection.')
      this.lobbyState = 'MENU'
      this.menuContainer.setVisible(true)
      if (this.nameInput) this.nameInput.style.display = 'block'
    }
  }

  private async onJoinRoom(): Promise<void> {
    const code = (this.domInput?.value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    if (code.length < 5) return
    this.lobbyState = 'CONNECTING'
    if (this.domInput) { this.domInput.blur(); this.domInput.style.display = 'none' }
    if (this.nameInput) this.nameInput.style.display = 'none'
    this.joinContainer.setVisible(false)
    this.statusText.setText('Connecting...')
    this.network = new PvPNetwork()
    this.network.localName = this.getLocalName()
    try {
      await this.network.joinRoom(code)
      this.startBattle()
    } catch {
      this.statusText.setText('Could not connect. Check the code and try again.')
      this.lobbyState = 'JOINING'
      this.joinContainer.setVisible(true)
      if (this.domInput) { this.domInput.style.display = 'block'; this.domInput.focus() }
      if (this.nameInput) this.nameInput.style.display = 'block'
    }
  }

  private startBattle(): void {
    this.scene.start('TransitionLoadingScene', {
      next: 'BattleScene',
      data: { pvpNetwork: this.network },
    })
  }

  private goBack(): void {
    this.stopWaitingDots()
    if (this.domInput) { this.domInput.blur(); this.domInput.style.display = 'none' }
    if (this.nameInput) this.nameInput.style.display = 'block'
    this.network?.destroy()
    this.network = null
    this.scene.start('MainMenuScene')
  }

  // ---------------------------------------------------------------------------
  // Waiting animation
  // ---------------------------------------------------------------------------

  private startWaitingDots(): void {
    this.dotCount = 0
    this.waitingText.setText('Waiting for opponent')
    this.dotTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.dotCount = (this.dotCount + 1) % 4
        this.waitingText.setText('Waiting for opponent' + '.'.repeat(this.dotCount))
      },
    })
  }

  private stopWaitingDots(): void {
    this.dotTimer?.destroy()
    this.dotTimer = null
  }

  // ---------------------------------------------------------------------------
  // Clipboard / share
  // ---------------------------------------------------------------------------

  private copyCode(): void {
    const code = this.network?.roomCode ?? ''
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      this.copyHint.setText('COPIED!').setColor('#88ffcc')
      this.time.delayedCall(1500, () => {
        if (this.lobbyState === 'WAITING_FOR_GUEST') {
          this.copyHint.setText('TAP TO COPY').setColor('#4477aa')
        }
      })
    }).catch(() => {
      this.copyHint.setText('COPY MANUALLY').setColor('#ffaa44')
    })
  }

  private shareCode(): void {
    const code = this.network?.roomCode ?? ''
    if (!code) return
    if (navigator.share) {
      navigator.share({
        title: 'Tiny Wars — Join my game!',
        text: `Join my Tiny Wars match! Room code: ${code}`,
        url: window.location.href,
      }).catch(() => { /* user cancelled */ })
    } else {
      this.copyCode()
    }
  }
}
