import { useEffect } from "react";

// Referral Stats Component
const ReferralStats = ({
  referrals,
  setOffWaitlist,
}: {
  referrals: Array<{
    userId: string;
    userName: string;
    candidateId: string;
    referredAt: string;
  }>;
  setOffWaitlist?: (shouldRemove: boolean) => void;
}) => {
  useEffect(() => {
    // If user has invited 3 or more friends, they should be removed from waitlist
    if (setOffWaitlist && referrals.length >= 3) {
      setOffWaitlist(true);
    }
  }, [referrals, setOffWaitlist]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="mt-[20px] w-full">
        {referrals.length > 0 ? (
          <table className="w-full text-left text-sm font-mono">
            <thead>
              <tr className="font-header">
                <th className="py-1 pr-4">Friends</th>
                <th className="py-1 pr-4">Candidate ID</th>
                <th className="py-1 pr-4">Joined</th>
              </tr>
            </thead>
            <tbody className="text-black">
              {referrals.slice(0, 3).map((referral) => (
                <tr key={referral.userId}>
                  <td className="py-1 pr-4">
                    {referral.userName || "Anonymous User"}
                  </td>
                  <td className="py-1 pr-4">{referral.candidateId || "N/A"}</td>
                  <td className="py-1 pr-4">
                    {referral.referredAt
                      ? new Date(referral.referredAt).toLocaleDateString()
                      : "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="mt-[20px] text-center">
            <p className="text-gray-500">
              Invite 3 friends to skip the waitlist
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralStats;
