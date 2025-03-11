export const isSubscriptionExpired = (endsAt: string) => {
  const now = new Date();
  const endsAtDate = new Date(endsAt);

  return {
    isExpired: endsAtDate < now,
    remainingDays: Math.floor(
      (endsAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
    expiringSoon:
      Math.floor(
        (endsAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ) < 2, // @ days
  };
};
