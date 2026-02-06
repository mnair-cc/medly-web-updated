import moment from "moment";

type Referral = {
  userId: string;
  userName: string;
  candidateId: string;
  referredAt: string;
};

const ReferralStats = ({ referrals }: { referrals: Referral[] }) => {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="mt-[20px] w-full">
        <table className="w-full text-left text-sm font-mono">
          <thead>
            <tr className="font-header">
              <th className="py-1 pr-4">Friend</th>
              <th className="py-1 pr-4">Candidate ID</th>
              <th className="py-1 pr-4">Registered</th>
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
                    ? moment(referral.referredAt).format("DD/MM/YYYY")
                    : "Unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {referrals.length < 3 && (
          <div className="mt-[20px] text-center">
            <p className="text-gray-500">
              Invite {3 - referrals.length} more friends to skip the waitlist
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralStats;
