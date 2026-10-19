import { useState } from 'react'
import {
  isEmailShaped,
  MAX_LOGIN_ATTEMPTS,
  requestPasswordResetLink,
  resetLinkErrorMessage,
} from '../api/auth'
import { Modal, ModalHeading } from './Modal'
import { ctaDisabledClass, ctaPrimaryClass } from './form/CtaButton'
import { TextField } from './form/TextField'

/*
 * 로그인 실패 팝업 두 개 (시안 224:30719 · 224:30728).
 *
 * 시안이 「로그인 8회 실패」, 「10회 실패하여 계정이 잠겼습니다」처럼 횟수를 글자로 박아
 * 두었다. 서버가 401 에 failedAttempts · maxFailedAttempts 를 실어 주지만 비밀번호가
 * 틀린 경우에만 실린다 — 잠긴 계정(423)이나 미등록 이메일에는 없다.
 *
 * 그래서 누적 횟수만 서버 값이 있을 때 쓰고, 잠금 기준은 정책 상수(MAX_LOGIN_ATTEMPTS)로
 * 채운다. 계정마다 다른 값이 아니라 매번 받아 올 이유가 없다.
 */

/** 401 AUTH_INVALID_CREDENTIALS — 이메일이 없거나 비밀번호가 틀렸을 때. */
export function LoginFailedDialog({
  open,
  onClose,
  failedCount,
  maxCount,
}: {
  open: boolean
  onClose: () => void
  /** 누적 실패 횟수. 숫자가 안 오는 실패도 있어 없을 수 있다. */
  failedCount?: number
  /** 잠기는 기준. 401 에 실려 올 때만 값이 있고, 없으면 정책 상수를 쓴다. */
  maxCount?: number
}) {
  const title = failedCount === undefined ? '로그인 실패' : `로그인 ${failedCount}회 실패`

  return (
    <Modal open={open} onClose={onClose} label={title}>
      <ModalHeading title={title}>
        <p>{maxCount ?? MAX_LOGIN_ATTEMPTS}회 실패시 계정이 잠금 상태로 설정되고</p>
        <p>이메일을 통해 비밀번호를 재설정 해야합니다.</p>
      </ModalHeading>

      {/* 안내만 하는 팝업이라 엔터가 곧 「확인」이 되게 한다. */}
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className={`${ctaPrimaryClass} w-full`}
      >
        확인
      </button>
    </Modal>
  )
}

type AccountLockedDialogProps = {
  open: boolean
  onClose: () => void
  /** 로그인 화면에서 입력했던 이메일. 다시 치지 않도록 채워 준다. */
  defaultEmail?: string
  /** 잠기는 기준 횟수. 없으면 정책 상수를 쓴다. */
  maxCount?: number
}

/**
 * 423 AUTH_ACCOUNT_LOCKED — 연속 실패로 잠긴 계정.
 *
 * 시간이 지나도 풀리지 않고, 본인이 재설정 링크를 받아 새 비밀번호를 확정하는 것만이
 * 유일한 해제다. 그래서 이 팝업은 안내가 아니라 실제 출구다.
 *
 * 401 인데 이 팝업을 띄워야 하는 경우가 있다 — failedAttempts 가 상한에 닿은 그 응답이
 * 곧 잠금 시점이라 상태 코드는 아직 401 이다. 판단은 LoginPage 가 한다.
 */
export function AccountLockedDialog({
  open,
  onClose,
  defaultEmail = '',
  maxCount,
}: AccountLockedDialogProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = isEmailShaped(email.trim()) && !sending && !sent

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      await requestPasswordResetLink(email.trim())
      setSent(true)
    } catch (caught) {
      setError(resetLinkErrorMessage(caught))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="비밀번호 재설정">
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <ModalHeading title="비밀번호 재설정">
          <p>
            로그인을 {maxCount ?? MAX_LOGIN_ATTEMPTS}회 실패하여 계정이 잠겼습니다.
          </p>
          <p>이메일로 비밀번호 재설정 링크가 발송됩니다.</p>
        </ModalHeading>

        <TextField
          inputMode="email"
          autoComplete="email"
          aria-label="이메일"
          placeholder="이메일"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setSent(false)
          }}
          onClear={() => setEmail('')}
          className="font-medium"
        />

        {/*
         * 보냈다는 사실만 알리고 「가입된 주소인지」는 말하지 않는다. 로그인이 미등록
         * 이메일과 비밀번호 불일치를 같은 401 로 묶어 둔 걸 여기서 되돌리면 안 된다.
         */}
        {sent && (
          <p role="status" className="text-cool-neutral-70 text-sm leading-5">
            메일을 보냈습니다. 보이지 않으면 스팸함을 확인해 주세요.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm leading-5 text-red-600">
            {error}
          </p>
        )}
      </div>

      {/*
       * 시안은 비활성(회색)으로 그려져 있다. 주소가 채워지면 활성으로 바뀐다.
       *
       * 라벨은 시안(224:30737)의 「인증번호 발송」 대신 하는 일을 적었다. 바로 위 본문이
       * 「재설정 링크가 발송됩니다」인데 버튼만 인증번호라고 하면 같은 팝업 안에서 두 말을
       * 하게 된다. 메일 본문 시안(224:30738)도 번호가 아니라 링크 버튼이다.
       */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className={(canSend ? ctaPrimaryClass : ctaDisabledClass) + ' w-full'}
      >
        {sent ? '발송 완료' : sending ? '발송 중…' : '재설정 링크 발송'}
      </button>
    </Modal>
  )
}
