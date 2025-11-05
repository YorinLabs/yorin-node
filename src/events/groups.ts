import type { ServerEvent, GroupProperties } from "../types";

export interface GroupOptions {
  anonymousUserId?: string;
  sessionId?: string;
  timestamp?: string;
}

export class GroupManager {
  /**
   * Create or update a group
   */
  public static createAddOrUpdateGroupEvent(
    groupId: string,
    userId?: string,
    properties?: Omit<GroupProperties, "group_id">,
    options?: GroupOptions
  ): ServerEvent {
    if (!groupId) {
      throw new Error("Group ID is required for addOrUpdateGroup");
    }

    const processedProperties: Record<string, unknown> = {
      group_id: groupId,
    };

    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "name" && !("$name" in properties)) {
            processedProperties["$name"] = value;
          } else {
            processedProperties[key] = value;
          }
        }
      });
    }

    return {
      event_name: "addOrUpdateGroup",
      user_id: userId,
      properties: processedProperties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Delete a group
   */
  public static createDeleteGroupEvent(
    groupId: string,
    userId?: string,
    options?: GroupOptions
  ): ServerEvent {
    if (!groupId) {
      throw new Error("Group ID is required for deleteGroup");
    }

    return {
      event_name: "deleteGroup",
      user_id: userId,
      properties: {
        group_id: groupId,
      },
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }
}