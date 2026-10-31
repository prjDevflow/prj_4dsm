import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '@/theme';

// Icons named in tokens.md (Material Symbols Rounded). They are drawn with the MaterialIcons of
// @expo/vector-icons for now (❓ 4); switching the font later changes only this file.
export const iconNames = [
  'qr_code_scanner',
  'arrow_back',
  'chevron_right',
  'expand_more',
  'logout',
  'add',
  'add_link',
  'add_business',
  'person_add',
  'edit',
  'search',
  'arrow_drop_down',
  'content_copy',
  'refresh',
  'key',
  'my_location',
  'confirmation_number',
  'history',
  'calendar_month',
  'schedule',
  'check',
  'check_circle',
  'close',
  'wifi_off',
  'warning',
  'info',
  'dark_mode',
  'lock_clock',
  'hourglass_disabled',
  'search_off',
  'error',
  'progress_activity',
  'photo_camera',
  'no_photography',
  'location_on',
  'location_off',
  'flashlight_on',
  'flashlight_off',
  'group',
  'apartment',
  'nfc',
  'contactless',
  'tablet_android',
  'support_agent',
  'login',
  'door_front',
  'qr_code_2',
  'timer_off',
  'restart_alt',
  'wrong_location',
  'block',
  'cancel',
  'event_busy',
  'remove_circle',
  'person_off',
  'remove',
  'visibility',
  'visibility_off',
] as const;

export type IconName = (typeof iconNames)[number];

type GlyphName = ComponentProps<typeof MaterialIcons>['name'];

// Symbols that MaterialIcons does not have.
const replacements: Partial<Record<IconName, GlyphName>> = { progress_activity: 'autorenew' };

export const toMaterialIconName = (name: IconName): GlyphName =>
  replacements[name] ?? (name.replace(/_/g, '-') as GlyphName);

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Only for an icon that stands alone; next to a text the icon is decorative. */
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export const Icon = ({
  name,
  size = 24,
  color = colors.texto,
  accessibilityLabel,
  style,
  testID,
}: IconProps) => (
  <MaterialIcons
    name={toMaterialIconName(name)}
    size={size}
    color={color}
    style={style}
    testID={testID}
    allowFontScaling={false}
    accessible={!!accessibilityLabel}
    accessibilityRole={accessibilityLabel ? 'image' : undefined}
    accessibilityLabel={accessibilityLabel}
    accessibilityElementsHidden={!accessibilityLabel}
    importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
  />
);
