import type { ServerEvent } from "../types";

export interface TrackingOptions {
  anonymousUserId?: string;
  sessionId?: string;
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  userAgent?: string;
  timestamp?: string;
}

export interface PageOptions {
  url?: string;
  title?: string;
  referrer?: string;
}

export class TrackingManager {
  /**
   * Create a custom tracking event
   */
  public static createTrackEvent(
    eventName: string,
    userId?: string,
    properties?: Record<string, unknown>,
    options?: TrackingOptions
  ): ServerEvent {
    if (!eventName) {
      throw new Error("Event name is required");
    }

    if (!userId && !properties?.group_id) {
      throw new Error(
        "Either user_id or group_id (in properties) is required for server events"
      );
    }

    return {
      event_name: eventName,
      user_id: userId,
      properties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      page_url: options?.pageUrl,
      page_title: options?.pageTitle,
      referrer: options?.referrer,
      user_agent: options?.userAgent,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Create a page view event
   */
  public static createPageEvent(
    name?: string,
    userId?: string,
    properties?: Record<string, unknown>,
    options?: PageOptions
  ): ServerEvent {
    return {
      event_name: "page",
      user_id: userId,
      properties: {
        name,
        ...properties,
      },
      page_url: options?.url,
      page_title: options?.title || name,
      referrer: options?.referrer,
      timestamp: new Date().toISOString(),
    };
  }
}