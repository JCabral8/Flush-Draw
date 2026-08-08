import { t } from '../i18n'
import type { Prefs } from '../prefs'
import { useGame } from '../store'

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={`setting ${value ? 'on' : ''}`}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <span className="setting-state num">{value ? t('settings.on') : t('settings.off')}</span>
    </button>
  )
}

export function SettingsOverlay(): JSX.Element | null {
  const open = useGame((s) => s.settingsOpen)
  const prefs = useGame((s) => s.prefs)
  const setPref = useGame((s) => s.setPref)
  const toggleSettings = useGame((s) => s.toggleSettings)
  if (!open) return null

  const scale = (v: Prefs['textScale']): void => setPref('textScale', v)

  return (
    <div className="overlay" onClick={() => toggleSettings(false)}>
      <div className="overlay-card settings" onClick={(e) => e.stopPropagation()}>
        <div className="ceremony-title">{t('settings.title')}</div>
        <Toggle label={t('settings.sound')} value={prefs.sound} onChange={(v) => setPref('sound', v)} />
        <Toggle
          label={t('settings.haptics')}
          value={prefs.haptics}
          onChange={(v) => setPref('haptics', v)}
        />
        <Toggle
          label={t('settings.reducedMotion')}
          value={prefs.reducedMotion}
          onChange={(v) => setPref('reducedMotion', v)}
        />
        <Toggle
          label={t('settings.fourColor')}
          value={prefs.fourColor}
          onChange={(v) => setPref('fourColor', v)}
        />
        <div className="setting-row">
          <span>{t('settings.textSize')}</span>
          <div className="setting-scale">
            {([1, 1.15, 1.3] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`wild-chip num ${prefs.textScale === v ? 'sel' : ''}`}
                onClick={() => scale(v)}
              >
                A{v === 1 ? '' : v === 1.15 ? '+' : '++'}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="go" onClick={() => toggleSettings(false)}>
          {t('settings.done')}
        </button>
      </div>
    </div>
  )
}
