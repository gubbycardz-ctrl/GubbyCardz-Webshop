// Server-only entry of the auth module.
import "server-only";

export {
  ADMIN_LOGIN_PATH,
  endSession,
  getSessionUser,
  requireAdmin,
  startAdminSession,
  type StartSessionResult,
} from "./session";
