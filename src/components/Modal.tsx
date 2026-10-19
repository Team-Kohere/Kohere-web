import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Tab 으로 갈 수 있는 요소. 팝업 안에서 포커스를 돌릴 때 쓴다. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type ModalProps = {
  open: boolean
  /**
   * 배경 클릭 · ESC 로 닫을 때 부른다.
   *
   * **넘기지 않으면 그 두 가지로 닫히지 않는다.** 안내를 확인하고 닫는 팝업은 「닫기」가
   * 곧 하나뿐인 행동이라 넘기면 되지만, 선택을 묻는 팝업은 그렇지 않다 — 배경을 눌렀다고
   * 두 선택지 중 하나를 고른 걸로 치면 안 되고, 특히 되돌릴 수 없는 쪽이면 더 그렇다.
   * 그런 팝업은 버튼으로만 닫는다.
   */
  onClose?: () => void
  /** 스크린 리더가 읽을 제목. 화면에 보이는 제목과 같은 문구를 넣는다. */
  label: string
  /**
   * 안쪽 내용 기둥의 최대 너비.
   *
   * 카드는 어느 팝업이나 577px 인데 내용 너비는 시안마다 다르다. 「이메일 검색 결과」
   * (224:30671)는 377, 「비밀번호 재설정」(224:30728)은 425 다. 그래서 카드는 고정해
   * 두고 이 값만 바꾼다.
   */
  contentWidth?: string
  children: ReactNode
}

/**
 * 화면 가운데 뜨는 팝업. 시안의 카드(너비 577 · 모서리 24 · 위아래 56 · 그림자)를 따른다.
 *
 * onClose 를 넘기면 배경 클릭과 ESC 로 닫힌다. 열려 있는 동안은 뒤 화면이 스크롤되지 않는다.
 */
export function Modal({
  open,
  onClose,
  label,
  contentWidth = 'max-w-[425px]',
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    // 스크롤 잠금은 닫을 수 있든 없든 건다. ESC 는 닫는 방법이 있을 때만 듣는다.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (onClose === undefined) {
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  /*
   * 포커스를 팝업 안으로 옮기고, 닫히면 원래 자리로 돌려준다.
   *
   * 옮기지 않으면 포커스가 뒤 화면에 남는다. 로그인 실패 팝업이 그랬다 — 비밀번호 칸에서
   * 엔터로 제출하면 팝업이 뜬 뒤에도 포커스가 그 칸에 있어서, 엔터 한 번에 로그인이 다시
   * 나가고 실패 횟수가 올라갔다.
   *
   * onClose 는 부르는 쪽이 매번 새로 만드는 경우가 많아 의존성에 넣지 않는다. 넣으면
   * 다시 그릴 때마다 「원래 자리」를 팝업 자신으로 덮어쓴다.
   */
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // 안쪽에서 autoFocus 로 이미 잡았으면 그대로 둔다. 아니면 카드 자체에 둔다 — 선택을 묻는
    // 팝업에서 첫 버튼에 두면 엔터 한 번이 그 선택이 되어 버린다.
    if (!dialog.contains(document.activeElement)) dialog.focus()

    // Tab 으로 뒤 화면까지 나가지 않게 팝업 안에서 돈다.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-12"
      // 누른 지점이 배경일 때만 닫는다. click 을 쓰면 카드 안에서 드래그해 배경에서 뗐을 때도 닫힌다.
      onMouseDown={
        onClose &&
        ((event) => {
          if (event.target === event.currentTarget) onClose()
        })
      }
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="outline-none flex w-full max-w-[577px] flex-col items-center rounded-3xl bg-white px-6 py-14 shadow-[0_16px_72px_0_rgba(23,23,23,0.16)]"
      >
        <div className={'flex w-full flex-col items-center gap-12 ' + contentWidth}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 팝업 제목 + 본문. 시안의 24px Bold / 18px Regular 묶음이다. */
export function ModalHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h2 className="text-cool-neutral-50 w-full text-2xl leading-[1.6] font-bold">{title}</h2>
      <div className="text-cool-neutral-80 text-lg leading-6">{children}</div>
    </div>
  )
}
