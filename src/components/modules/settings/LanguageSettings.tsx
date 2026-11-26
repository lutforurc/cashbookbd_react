import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { Input } from '../../utils/fields/FormControls';
import httpService from '../../services/httpService';
import { API_LANGUAGE_SETTINGS_URL } from '../../services/apiRoutes';
import { getSettings } from './settingsSlice';
import type { LanguageInfo } from '../../../i18n/languages';
import {
  applyFontScale,
  cacheFontScale,
  clampFontScale,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  resolveFontScale,
} from '../../../theme/fontScale';

type UiLanguage = 'en' | 'local';
type DigitStyle = 'auto' | 'latin' | 'native';

/**
 * One choice in a radio row. The panel has three small sets of them, and a
 * native radio keeps the browser's own keyboard behaviour.
 */
const RadioOption = ({
  name,
  value,
  checked,
  onSelect,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
}) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm text-[rgb(var(--c-text))]">
    <Input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onSelect}
      className="h-4 w-4"
    />
    <span>{label}</span>
  </label>
);

/**
 * Branch Settings -> Update Branch -> Language Settings (a step of the branch
 * form, AddBranch.tsx).
 *
 * One switch for the whole company ("does it also run in a local language?")
 * and, while it is on, the defaults of the branch being edited. Off is not a
 * delete: the branch metas are left exactly as they are, and the data behind
 * them is never touched.
 *
 * ⚠️ IT SAVES ITSELF. These values go to their own endpoint
 * (/settings/language, permission language.settings) with this panel's own
 * Save button; the branch form's Update does not carry them.
 *
 * The panel's own labels are translated (t()) -- the first real screen whose
 * words change with the switch it controls.
 */
const LanguageSettings = ({ branchId }: { branchId: number }) => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch();

  const [localLanguage, setLocalLanguage] = useState('');
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('en');
  const [printLanguage, setPrintLanguage] = useState<UiLanguage>('en');
  const [digitStyle, setDigitStyle] = useState<DigitStyle>('auto');
  /**
   * The size this branch reads the software at. A display setting rather than a
   * language one, but it saves itself with this panel, so it lives here -- see
   * theme/fontScale.ts for how it reaches every screen.
   */
  const [fontScale, setFontScale] = useState<number>(FONT_SCALE_DEFAULT);
  /**
   * The value the branch is actually saved at. Dragging the slider resizes the
   * whole screen at once -- a real preview, not a sample box -- so leaving the
   * panel without saving has to put the saved size back.
   */
  const savedScale = useRef<number>(FONT_SCALE_DEFAULT);
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const load = useCallback(async (id: number) => {
    try {
      const response = await httpService.get(API_LANGUAGE_SETTINGS_URL, {
        params: { branch_id: id },
      });
      const body = response?.data;
      const payload = body?.data?.data;

      if (body?.success && payload) {
        setLanguages(Array.isArray(payload.languages) ? payload.languages : []);
        setLocalLanguage(payload.local_language || '');
        setUiLanguage(payload.ui_language === 'local' ? 'local' : 'en');
        setPrintLanguage(payload.print_language === 'local' ? 'local' : 'en');
        setDigitStyle(
          payload.digit_style === 'latin' || payload.digit_style === 'native'
            ? payload.digit_style
            : 'auto',
        );
        const stored = resolveFontScale(payload.font_scale, id);
        setFontScale(stored);
        savedScale.current = stored;
      } else {
        toast.error(body?.message || body?.error?.message || i18next.t('language.settings.loadFailed'));
      }
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.message || i18next.t('language.settings.loadFailed'));
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (branchId) load(branchId);
  }, [branchId, load]);

  // The slider previews on the whole screen, so leaving without Save puts the
  // size the branch is actually saved at back on the page.
  useEffect(() => () => applyFontScale(savedScale.current), []);

  // The one local language this company can have (Bangla in Phase 1). The
  // active list decides which, so adding Arabic later needs no panel change.
  const localInfo = useMemo(
    () =>
      languages.find((language) => language.code === localLanguage) ??
      languages.find((language) => language.code !== 'en') ??
      null,
    [languages, localLanguage],
  );

  const localCandidate = localInfo?.code || 'bn';
  const localLabel = languages.find((language) => language.code !== 'en')?.native_name || 'বাংলা';

  const onToggleLocal = (checked: boolean) => {
    if (checked) {
      setLocalLanguage(localCandidate);
      return;
    }

    // Off is a real change of behaviour, so it is confirmed first.
    setConfirmOff(true);
  };

  /**
   * Write to the language endpoint, then fetch the session again: the header
   * button appears or disappears from that payload, without a page reload.
   */
  const post = async (body: Record<string, unknown>, onDone?: () => void) => {
    setSaving(true);

    try {
      const response = await httpService.post(API_LANGUAGE_SETTINGS_URL, body);
      const data = response?.data;

      if (data?.success) {
        onDone?.();
        toast.success(data?.message || t('language.settings.saved'));
        dispatch(getSettings() as any);
        load(branchId);
      } else {
        toast.error(data?.message || data?.error?.message || t('language.settings.saveFailed'));
      }
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.message || t('language.settings.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const save = () =>
    post({
      local_language: localLanguage || null,
      branch_id: branchId,
      font_scale: fontScale,
      // The three below only mean anything while the local language is on.
      ...(localLanguage
        ? {
            ui_language: uiLanguage,
            print_language: printLanguage,
            digit_style: digitStyle,
          }
        : {}),
    }, () => {
      // Kept here as well: the session refetch may not yet carry the value back.
      cacheFontScale(branchId, fontScale);
      savedScale.current = fontScale;
    });

  /** Confirmed "turn it off": only the company switch is written. */
  const turnOff = () =>
    post({ local_language: null, branch_id: branchId, font_scale: fontScale }, () => {
      cacheFontScale(branchId, fontScale);
      setConfirmOff(false);
      setLocalLanguage('');
    });

  if (!loaded) return <Loader />;

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-[rgb(var(--c-text-muted))]">
        {t('language.settings.intro')}
      </p>

      <FormToggleField
        label={t('language.settings.enableLocal')}
        description={t('language.settings.enableLocalHint')}
        checked={Boolean(localLanguage)}
        onChange={onToggleLocal}
        className="mb-4"
      />

      {localLanguage ? (
        <div className="space-y-5 border-t border-[rgb(var(--c-border))] pt-4">
          <p className="text-xs text-[rgb(var(--c-text-muted))]">{t('language.settings.branchHint')}</p>

          <div>
            <p className="mb-2 text-sm font-medium text-[rgb(var(--c-text))]">
              {t('language.settings.uiLanguage')}
            </p>
            <div className="flex flex-wrap gap-5">
              <RadioOption
                name="ui_language"
                value="en"
                checked={uiLanguage === 'en'}
                onSelect={() => setUiLanguage('en')}
                label={t('language.english')}
              />
              <RadioOption
                name="ui_language"
                value="local"
                checked={uiLanguage === 'local'}
                onSelect={() => setUiLanguage('local')}
                label={localLabel}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[rgb(var(--c-text))]">
              {t('language.settings.printLanguage')}
            </p>
            <div className="flex flex-wrap gap-5">
              <RadioOption
                name="print_language"
                value="en"
                checked={printLanguage === 'en'}
                onSelect={() => setPrintLanguage('en')}
                label={t('language.english')}
              />
              <RadioOption
                name="print_language"
                value="local"
                checked={printLanguage === 'local'}
                onSelect={() => setPrintLanguage('local')}
                label={localLabel}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[rgb(var(--c-text))]">
              {t('language.settings.digits')}
            </p>
            <div className="flex flex-wrap gap-5">
              <RadioOption
                name="digit_style"
                value="auto"
                checked={digitStyle === 'auto'}
                onSelect={() => setDigitStyle('auto')}
                label={t('language.settings.digitsAuto')}
              />
              <RadioOption
                name="digit_style"
                value="latin"
                checked={digitStyle === 'latin'}
                onSelect={() => setDigitStyle('latin')}
                label={t('language.settings.digitsLatin')}
              />
              <RadioOption
                name="digit_style"
                value="native"
                checked={digitStyle === 'native'}
                onSelect={() => setDigitStyle('native')}
                label={t('language.settings.digitsNative')}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* The branch's own reading size. It is a display setting rather than a
          language one, but it saves itself with this panel -- and the whole
          screen follows the slider as it moves, so what is being chosen is the
          page itself rather than a sample of it. */}
      <div className="mt-5 border-t border-[rgb(var(--c-border))] pt-4">
        <p className="mb-1 text-sm font-medium text-[rgb(var(--c-text))]">
          {t('language.settings.fontSize')}
        </p>
        <p className="mb-3 text-xs leading-relaxed text-[rgb(var(--c-text-muted))]">
          {t('language.settings.fontSizeHint')}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-[rgb(var(--c-text-muted))]">{FONT_SCALE_MIN}%</span>
          <input
            id="branch_font_scale"
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={fontScale}
            onChange={(e) => {
              const next = clampFontScale(e.target.value);
              setFontScale(next);
              // The whole screen is the preview, at once.
              applyFontScale(next);
            }}
            aria-label={t('language.settings.fontSize')}
            className="w-full max-w-md"
          />
          <span className="text-xs text-[rgb(var(--c-text-muted))]">{FONT_SCALE_MAX}%</span>
          <span className="min-w-14 text-right text-sm font-semibold text-[rgb(var(--c-text))]">
            {fontScale}%
          </span>
          <button
            type="button"
            onClick={() => {
              setFontScale(FONT_SCALE_DEFAULT);
              applyFontScale(FONT_SCALE_DEFAULT);
            }}
            className="rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-[rgb(var(--c-text-muted))] hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {t('language.settings.fontSizeReset')}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--c-border))] pt-4">
        <p className="text-xs text-[rgb(var(--c-text-muted))]">{t('language.settings.savesItself')}</p>
        <ButtonLoading onClick={save} buttonLoading={saving} label={t('language.settings.save')} />
      </div>

      <ConfirmModal
        show={confirmOff}
        title={t('language.settings.confirmOffTitle')}
        message={t('language.settings.confirmOff')}
        confirmLabel={t('language.settings.confirmOffButton')}
        loading={saving}
        onCancel={() => setConfirmOff(false)}
        onConfirm={turnOff}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default LanguageSettings;
