import type { ServerEvent, IdentifyProperties } from "../types";

export interface ContactOptions {
  anonymousUserId?: string;
  sessionId?: string;
  timestamp?: string;
}

export class ContactManager {
  /**
   * Create or update a contact
   */
  public static createAddOrUpdateContactEvent(
    userId: string,
    properties?: IdentifyProperties,
    options?: ContactOptions
  ): ServerEvent {
    if (!userId) {
      throw new Error("User ID is required for addOrUpdateContact");
    }

    const processedProperties: Record<string, unknown> = {};

    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "email" && !("$email" in properties)) {
            processedProperties["$email"] = value;
          } else if (key === "name" && !("$full_name" in properties)) {
            processedProperties["$full_name"] = value;
          } else {
            processedProperties[key] = value;
          }
        }
      });
    }

    return {
      event_name: "addOrUpdateContact",
      user_id: userId,
      properties: processedProperties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Delete a contact
   */
  public static createDeleteContactEvent(
    userId: string,
    options?: ContactOptions
  ): ServerEvent {
    if (!userId) {
      throw new Error("User ID is required for deleteContact");
    }

    return {
      event_name: "deleteContact",
      user_id: userId,
      properties: {},
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }
}