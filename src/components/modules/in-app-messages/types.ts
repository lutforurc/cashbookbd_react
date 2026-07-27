export type InAppLayout =
  | 'MODAL'
  | 'BANNER_TOP'
  | 'BANNER_BOTTOM'
  | 'CARD'
  | 'IMAGE_ONLY';

export type InAppTrigger = 'APP_OPEN' | 'LOGIN';

export type InAppEventName = 'IMPRESSION' | 'CLICK' | 'DISMISS' | 'ACK';

export type InAppAudience = 'global' | 'company' | 'branch' | 'role' | 'user';

export type InAppPlatform = 'all' | 'web' | 'android' | 'ios';

export type InAppStatus = 'draft' | 'active' | 'paused';

/** What the client renders — the shape InAppMessageController@sync returns. */
export interface InAppMessage {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  layout: InAppLayout;
  trigger_event: InAppTrigger;
  primary_label: string | null;
  primary_action: string | null;
  secondary_label: string | null;
  secondary_action: string | null;
  bg_color: string | null;
  text_color: string | null;
  button_color: string | null;
  priority: number;
  require_ack: boolean;
  display_limit: number | null;
  min_interval_hours: number;
  shown_count: number;
}

export interface InAppMessageEvent {
  message_id: number;
  event: InAppEventName;
  platform: 'web';
  device_id?: string;
  action_target?: string | null;
  occurred_at?: string;
}

/** The admin row — campaign columns plus their delivery counters. */
export interface InAppMessageAdminRow extends InAppMessage {
  audience_type: InAppAudience;
  company_id: number | null;
  branch_id: number | null;
  role_id: number | null;
  user_id: number | null;
  platform: InAppPlatform;
  min_app_version: string | null;
  max_app_version: string | null;
  status: InAppStatus;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  reached_users: number;
  clicks: number;
  dismissals: number;
  acked_users: number;
}
