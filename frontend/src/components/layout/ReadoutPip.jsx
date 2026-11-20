import Tooltip from '../ui/Tooltip'
import { describeReadout, shortReadout } from './readoutText'

const DOT = { ok: 'bg-support', warm: 'bg-caution animate-pulse-soft', down: 'bg-contra', idle: 'bg-dim animate-pulse-soft' }

export default function ReadoutPip({ readout, withLabel = false }) {
  const { tone, label } = describeReadout(readout)
  return (
    <Tooltip text={label} side="bottom">
      <span role="img" aria-label={`System status: ${label}`} tabIndex={0} className="inline-flex items-center gap-2 rounded px-1.5 py-1">
        <span className={`h-2 w-2 rounded-full ${DOT[tone]}`} />
        {withLabel && <span className="t-meta" aria-hidden="true">{shortReadout(readout)}</span>}
      </span>
    </Tooltip>
  )
}
