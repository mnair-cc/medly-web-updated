import Link from "next/link";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import moment from "moment-timezone";

interface MockPanelBannerProps {
  isAfterResultsDay?: boolean;
}

interface BannerContent {
  title: string;
  description: string;
  items: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  footer: Array<{
    text: string;
    link?: string;
    isUnderlined?: boolean;
  }>;
}

const getRulesContent = (resultsDay: moment.Moment): BannerContent => ({
  title: "Medly Mocks Rules",
  description:
    "Welcome to Medly Christmas Mocks! Well done on completing your first term this year. Here's how to make the most of your mocks:",
  items: [
    {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.33838 18.4929C4.33838 19.1691 4.75663 19.4929 5.24332 19.4929C5.46385 19.4929 5.68439 19.4281 5.90492 19.313L13.8973 14.9101C14.4677 14.5935 14.6882 14.3561 14.6882 13.9964C14.6882 13.6367 14.4677 13.3993 13.8973 13.0827L5.90492 8.67986C5.68439 8.55755 5.46385 8.5 5.24332 8.5C4.75663 8.5 4.33838 8.81655 4.33838 9.49281V18.4929ZM14.6501 18.4929C14.6501 19.1691 15.0608 19.4929 15.5551 19.4929C15.768 19.4929 15.9962 19.4281 16.2167 19.313L24.2015 14.9101C24.7794 14.5935 25 14.3561 25 13.9964C25 13.6367 24.7794 13.3993 24.2015 13.0827L16.2167 8.67986C15.9962 8.55755 15.768 8.5 15.5551 8.5C15.0608 8.5 14.6501 8.81655 14.6501 9.49281V18.4929Z"
            fill="#06B0FF"
          />
        </svg>
      ),
      text: "Skip any topics you haven't learned",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.3457 18.0088C14.0293 18.0088 14.3418 17.54 14.3418 16.915C14.3418 16.8076 14.3418 16.6904 14.3418 16.583C14.3613 15.2939 14.8203 14.7568 16.3828 13.6826C18.0625 12.5498 19.1269 11.2412 19.1269 9.35643C19.1269 6.42674 16.7441 4.74706 13.7754 4.74706C11.5684 4.74706 9.63477 5.79198 8.80469 7.67674C8.59961 8.13573 8.51172 8.58495 8.51172 8.95604C8.51172 9.51268 8.83398 9.90331 9.42969 9.90331C9.92774 9.90331 10.2598 9.61034 10.4062 9.13182C10.9043 7.27635 12.1348 6.57323 13.707 6.57323C15.6113 6.57323 17.1055 7.64745 17.1055 9.34667C17.1055 10.7431 16.2363 11.5244 14.9863 12.4033C13.4531 13.4678 12.3301 14.6103 12.3301 16.3291C12.3301 16.5342 12.3301 16.7392 12.3301 16.9443C12.3301 17.5693 12.6719 18.0088 13.3457 18.0088ZM13.3457 23.3506C14.1269 23.3506 14.7422 22.7256 14.7422 21.9639C14.7422 21.1924 14.1269 20.5771 13.3457 20.5771C12.584 20.5771 11.959 21.1924 11.959 21.9639C11.959 22.7256 12.584 23.3506 13.3457 23.3506Z"
            fill="#06B0FF"
          />
        </svg>
      ),
      text: "Take your best guess at everything else",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.8193 23.9561C19.3174 23.9561 23.7803 19.4932 23.7803 13.9952C23.7803 8.4971 19.3174 4.03421 13.8193 4.03421C8.32129 4.03421 3.8584 8.4971 3.8584 13.9952C3.8584 19.4932 8.32129 23.9561 13.8193 23.9561ZM13.8193 22.2959C9.22949 22.2959 5.51856 18.585 5.51856 13.9952C5.51856 9.4053 9.22949 5.69437 13.8193 5.69437C18.4092 5.69437 22.1201 9.4053 22.1201 13.9952C22.1201 18.585 18.4092 22.2959 13.8193 22.2959Z"
            fill="#06B0FF"
          />
          <path
            d="M8.71192 15.0498H13.8096C14.1904 15.0498 14.4932 14.7569 14.4932 14.3662V7.78421C14.4932 7.40335 14.1904 7.11038 13.8096 7.11038C13.4287 7.11038 13.1357 7.40335 13.1357 7.78421V13.6924H8.71192C8.32129 13.6924 8.02832 13.9854 8.02832 14.3662C8.02832 14.7569 8.32129 15.0498 8.71192 15.0498Z"
            fill="#06B0FF"
          />
        </svg>
      ),
      text: "The exam is timed, but take longer if you need it",
    },
  ],
  footer: [
    {
      text: `Final results and report will be released ${resultsDay.tz("Europe/London").format("HH:mm, Do [of] MMM, YYYY")}.`,
    },
    {
      text: "Having trouble?",
      link: "https://tawk.to/medly",
      isUnderlined: true,
    },
  ],
});

const resultsContent: BannerContent = {
  title: "Medly Mocks Results",
  description:
    "Well done on completing your mocks! Here's a guide to making the most of your results:",
  items: [
    {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_777_4282)">
            <path
              d="M13.8193 23.9561C19.3174 23.9561 23.7803 19.4932 23.7803 13.9951C23.7803 8.49707 19.3174 4.03418 13.8193 4.03418C8.32129 4.03418 3.8584 8.49707 3.8584 13.9951C3.8584 19.4932 8.32129 23.9561 13.8193 23.9561ZM13.8193 22.2959C9.22949 22.2959 5.51856 18.585 5.51856 13.9951C5.51856 9.40527 9.22949 5.69434 13.8193 5.69434C18.4092 5.69434 22.1201 9.40527 22.1201 13.9951C22.1201 18.585 18.4092 22.2959 13.8193 22.2959Z"
              fill="#06B0FF"
            />
            <path
              d="M13.8193 20.1865C17.2373 20.1865 20.0107 17.4131 20.0107 13.9951C20.0107 10.5772 17.2373 7.80371 13.8193 7.80371C10.4014 7.80371 7.62793 10.5772 7.62793 13.9951C7.62793 17.4131 10.4014 20.1865 13.8193 20.1865ZM13.8193 18.6143C11.2607 18.6143 9.2002 16.5537 9.2002 13.9951C9.2002 11.4365 11.2607 9.37598 13.8193 9.37598C16.3779 9.37598 18.4385 11.4365 18.4385 13.9951C18.4385 16.5537 16.3779 18.6143 13.8193 18.6143Z"
              fill="#06B0FF"
            />
            <path
              d="M13.8193 16.5147C15.2158 16.5147 16.3486 15.3916 16.3486 13.9853C16.3486 12.5889 15.2158 11.4561 13.8193 11.4561C12.4228 11.4561 11.29 12.5889 11.29 13.9853C11.29 15.3916 12.4228 16.5147 13.8193 16.5147Z"
              fill="#06B0FF"
            />
          </g>
          <defs>
            <clipPath id="clip0_777_4282">
              <rect
                width="20.2832"
                height="19.9316"
                fill="white"
                transform="translate(3.8584 4.03418)"
              />
            </clipPath>
          </defs>
        </svg>
      ),
      text: "Read through your personalised feedback",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_777_4291)">
            <path
              d="M12.4082 20.4502V15.5186C12.4082 15.1768 12.2031 14.9912 11.8613 14.9912C11.7148 14.9912 11.5488 15.0498 11.4316 15.1475L8.51167 17.6084C8.26753 17.8135 8.248 18.1357 8.51167 18.3603L11.4316 20.8213C11.5488 20.9189 11.7148 20.9775 11.8613 20.9775C12.2031 20.9775 12.4082 20.792 12.4082 20.4502ZM21.4804 13.7412C21.0703 13.7412 20.7675 14.0537 20.7675 14.4639V15.2061C20.7675 16.4561 19.8593 17.3056 18.541 17.3056H11.2753C10.8847 17.3056 10.5624 17.6279 10.5624 18.0088C10.5624 18.3994 10.8847 18.7217 11.2753 18.7217H18.3945C20.7187 18.7217 22.2031 17.3935 22.2031 15.3135V14.4639C22.2031 14.0537 21.8906 13.7412 21.4804 13.7412Z"
              fill="#05B0FF"
            />
            <path
              d="M15.2305 7.65723V12.5889C15.2305 12.9307 15.4258 13.1162 15.7675 13.1162C15.9238 13.1162 16.08 13.0576 16.1972 12.96L19.1171 10.5088C19.371 10.2939 19.3906 9.97168 19.1171 9.74707L16.1972 7.28613C16.08 7.18848 15.9238 7.12988 15.7675 7.12988C15.4258 7.12988 15.2305 7.31543 15.2305 7.65723ZM6.1582 14.3662C6.5586 14.3662 6.8711 14.0537 6.8711 13.6436V12.9014C6.8711 11.6514 7.76953 10.8018 9.08789 10.8018H16.3632C16.7539 10.8018 17.0664 10.4795 17.0664 10.0986C17.0664 9.70801 16.7539 9.38574 16.3632 9.38574H9.24414C6.91993 9.38574 5.43555 10.7139 5.43555 12.7939V13.6436C5.43555 14.0537 5.74805 14.3662 6.1582 14.3662Z"
              fill="#05B0FF"
            />
          </g>
          <defs>
            <clipPath id="clip0_777_4291">
              <rect
                width="17.1289"
                height="13.8574"
                fill="white"
                transform="translate(5.43555 7.12012)"
              />
            </clipPath>
          </defs>
        </svg>
      ),
      text: "Retry questions you nearly answered correctly with Medly",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_777_4301)">
            <path
              d="M6.93945 15.1278C6.93945 15.5087 7.23242 15.7919 7.64258 15.7919H13.1602L10.25 23.7021C9.86914 24.7079 10.9141 25.245 11.5684 24.4247L20.4454 13.331C20.6114 13.1259 20.6993 12.9306 20.6993 12.706C20.6993 12.3349 20.4063 12.0419 19.9961 12.0419H14.4785L17.3887 4.13174C17.7696 3.12588 16.7246 2.58877 16.0703 3.41885L7.19336 14.5028C7.02734 14.7177 6.93945 14.913 6.93945 15.1278Z"
              fill="#06B0FF"
            />
          </g>
          <defs>
            <clipPath id="clip0_777_4301">
              <rect
                width="14.1211"
                height="21.9778"
                fill="white"
                transform="translate(6.93945 3.01099)"
              />
            </clipPath>
          </defs>
        </svg>
      ),
      text: "Keep up the momentum with topic practice on Medly",
    },
  ],
  footer: [
    {
      text: "Need help?",
      isUnderlined: true,
    },
  ],
};

const MockPanelBanner = ({
  isAfterResultsDay = false,
}: MockPanelBannerProps) => {
  const { resultsDay } = useMockDates();
  const content = isAfterResultsDay
    ? resultsContent
    : getRulesContent(resultsDay);
  return (
    <div className="flex flex-col gap-4 bg-gradient-to-b from-[#E6F7FF]/50 to-[#E6F7FF] rounded-3xl p-6 text-[#05B0FF] text-[14px]">
      <div>
        <h3 className="font-rounded-bold text-[17px]">{content.title}</h3>
        <p>{content.description}</p>
      </div>

      <div className="flex flex-col gap-3 px-16 mx-auto font-rounded-bold">
        {content.items.map((item, index) => (
          <div key={index} className="flex justify-start items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div>{item.text}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {content.footer.map((footerItem, index) => (
          <div key={index}>
            {footerItem.link ? (
              <Link
                href={footerItem.link}
                target="_blank"
                className={footerItem.isUnderlined ? "underline" : ""}
              >
                {footerItem.text}
              </Link>
            ) : (
              <div className={footerItem.isUnderlined ? "underline" : ""}>
                {footerItem.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MockPanelBanner;
