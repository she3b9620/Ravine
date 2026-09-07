export type RAVINEAccessContext = {
  authenticated: boolean;
  creatorIdentityOwner: boolean;
  followsCreator: boolean;
  member: boolean;
  invited: boolean;
  admin: boolean;
};

export type RAVINEAccessPolicy = "public" | "followers" | "members" | "tier" | "invite_only" | "private";

export function canAccessRAVINEWork(policy: RAVINEAccessPolicy, context: RAVINEAccessContext) {
  if (context.admin || context.creatorIdentityOwner) return true;
  switch (policy) {
    case "public": return true;
    case "followers": return context.authenticated && context.followsCreator;
    case "members":
    case "tier": return context.authenticated && context.member;
    case "invite_only": return context.authenticated && context.invited;
    case "private": return false;
  }
}

export function canInteractAsViewer(authenticated: boolean) {
  return authenticated;
}

export function canPublishAsCreator(context: RAVINEAccessContext) {
  return context.authenticated && context.creatorIdentityOwner;
}
