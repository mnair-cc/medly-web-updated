import { CoverContent } from "../../types";
import { useUser } from "@/app/_context/UserProvider";

const formatTimeAllowed = (timeInMinutes: string | number): string => {
  const totalMinutes =
    typeof timeInMinutes === "string" ? parseInt(timeInMinutes) : timeInMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  } else {
    const hourText = hours === 1 ? "1 hour" : `${hours} hours`;
    return `${hourText} ${minutes} minutes`;
  }
};

const PaperCover = ({
  paperId,
  content,
}: {
  paperId: string;
  content: CoverContent;
}) => {
  const { user } = useUser();

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const paperIdToDisplayId = (paperId: string) => {
    // Find the last occurrence of "Mock" in the string
    const mockIndex = paperId.lastIndexOf("Mock");
    if (mockIndex === -1) return "";

    // Get everything after "Mock"
    let afterMock = paperId.substring(mockIndex + 4); // 4 is length of "Mock"

    // Remove "higher" or "foundation" if they exist at the end (case insensitive)
    afterMock = afterMock.replace(/(higher|foundation)$/i, "");

    return afterMock;
  };

  const paperDisplayId = paperIdToDisplayId(paperId);

  if (content.examBoard === "AQA") {
    return (
      <div className="bg-white rounded-2xl overflow-visible min-w-[720px] max-w-[800px] mx-auto mt-8 border border-[#F2F2F7]">
        <div className="w-full flex flex-col justify-start items-center gap-4 p-16 mb-40">
          {/* Logo */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <svg
              width="208"
              height="40"
              viewBox="0 0 208 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M40.1384 9.40139C38.4132 8.35532 30.1855 2.86809 17.6613 17.7887L15.422 20.1724C15.422 20.1724 4.7832 15.5338 1.1802 20.5788C-1.85526 24.8292 1.51749 29.2567 5.05886 29.2567C8.97426 29.2567 12.564 26.0519 15.1732 23.2626L23.9816 29.5132C26.6356 31.385 29.7376 32.4444 32.9059 32.4444C36.1572 32.4268 40.3373 31.438 43.1076 27.412C48.5673 19.162 43.6769 11.5468 40.1384 9.40139ZM5.74253 23.9411C5.56881 23.0204 5.99258 22.3098 6.60657 21.9946C8.49629 21.0244 12.9338 22.4679 12.9338 22.4679C12.9338 22.4679 9.73133 25.1999 7.59604 25.368C6.72999 25.4362 5.94694 25.0243 5.74253 23.9411ZM36.5713 19.0956C36.0737 21.9208 33.7675 25.3762 24.5455 22.9976C18.9055 21.4086 17.4555 20.7118 17.4555 20.7118C17.4555 20.7118 23.7209 13.7471 28.8584 12.9329C35.0803 11.9468 37.0691 16.2704 36.5713 19.0956Z"
                fill="url(#paint0_linear_621_1527)"
              />
              <path
                d="M59.3602 29.6068C58.2274 29.6068 57.4592 28.9167 57.4592 27.6276V17.0287C57.4592 15.7527 58.2144 15.0885 59.2951 15.0885C60.3759 15.0885 61.1311 15.7527 61.1311 17.0287V17.9011H61.2092C61.7951 16.2213 63.2926 15.1145 65.1935 15.1145C67.2118 15.1145 68.618 16.1563 69.0868 17.9792H69.165C69.7899 16.2213 71.4566 15.1145 73.5008 15.1145C76.2352 15.1145 78.0711 16.9896 78.0711 19.8021V27.6276C78.0711 28.9167 77.2899 29.6068 76.1571 29.6068C75.0374 29.6068 74.2691 28.9167 74.2691 27.6276V20.7527C74.2691 19.138 73.4618 18.2527 71.9904 18.2527C70.5451 18.2527 69.5946 19.3073 69.5946 20.8568V27.6276C69.5946 28.9167 68.8915 29.6068 67.7587 29.6068C66.6388 29.6068 65.9358 28.9167 65.9358 27.6276V20.6355C65.9358 19.138 65.0894 18.2527 63.6831 18.2527C62.2378 18.2527 61.2612 19.3464 61.2612 20.9088V27.6276C61.2612 28.9167 60.48 29.6068 59.3602 29.6068ZM86.8992 29.6328C82.5374 29.6328 79.9722 26.9375 79.9722 22.4193C79.9722 17.9271 82.5894 15.0755 86.717 15.0755C90.6754 15.0755 93.3316 17.7839 93.3316 21.5729C93.3316 22.6276 92.7326 23.2265 91.6779 23.2265H83.7092V23.3959C83.7092 25.4661 84.9592 26.8203 86.8863 26.8203C88.2795 26.8203 89.191 26.3516 90.2196 25.1407C90.6232 24.724 90.9618 24.5807 91.4566 24.5807C92.2768 24.5807 92.941 25.1016 92.941 25.974C92.941 26.2735 92.8498 26.586 92.6806 26.8984C91.756 28.6172 89.5946 29.6328 86.8992 29.6328ZM83.7483 20.8959H89.6727C89.5946 19.0729 88.4227 17.888 86.756 17.888C85.0894 17.888 83.8784 19.112 83.7483 20.8959ZM100.48 29.5547C96.9904 29.5547 94.7899 26.7943 94.7899 22.3281C94.7899 17.9011 97.0035 15.1536 100.506 15.1536C102.524 15.1536 104.087 16.2213 104.764 17.7708H104.842V12.25C104.842 10.9479 105.636 10.2578 106.743 10.2578C107.863 10.2578 108.644 10.9479 108.644 12.25V27.6797C108.644 28.9427 107.863 29.6068 106.756 29.6068C105.662 29.6068 104.842 28.9557 104.842 27.6797V26.8724H104.777C104.165 28.4349 102.628 29.5547 100.48 29.5547ZM101.769 26.4948C103.657 26.4948 104.868 24.9063 104.868 22.3541C104.868 19.8151 103.657 18.2005 101.769 18.2005C99.855 18.2005 98.6831 19.8021 98.6831 22.3541C98.6831 24.9193 99.855 26.4948 101.769 26.4948ZM113.175 29.6068C112.069 29.6068 111.274 28.9297 111.274 27.6276V12.25C111.274 10.9479 112.069 10.2578 113.175 10.2578C114.295 10.2578 115.076 10.9479 115.076 12.25V27.6276C115.076 28.9297 114.295 29.6068 113.175 29.6068ZM120.011 34.5027C118.345 34.5027 117.446 33.8645 117.446 32.7188C117.446 31.9505 117.98 31.4688 118.839 31.4688C119.1 31.4688 119.243 31.4817 119.504 31.4817C120.168 31.4817 120.884 31.1953 121.339 30.2188L121.535 29.724L117.082 17.9792C116.938 17.5885 116.86 17.1719 116.86 16.8593C116.86 15.8307 117.707 15.0885 118.826 15.0885C119.829 15.0885 120.35 15.5183 120.662 16.6251L123.696 26.2864H123.761L126.795 16.5989C127.108 15.5443 127.654 15.0885 128.631 15.0885C129.725 15.0885 130.48 15.8047 130.48 16.8073C130.48 17.1197 130.402 17.5625 130.272 17.9271L125.988 29.5677C124.686 33.1745 123.071 34.5027 120.011 34.5027Z"
                fill="black"
              />
              <path
                d="M143.493 29.5547C139.821 29.5547 137.452 26.9115 137.452 22.5755V22.5626C137.452 18.2527 139.835 15.5703 143.349 15.5703C146.852 15.5703 149.196 18.2006 149.196 22.2631V22.7318H138.467C138.519 26.5339 140.511 28.6432 143.507 28.6432C145.863 28.6432 147.477 27.4454 147.972 25.5574L148.011 25.4531H149.027L149.001 25.5703C148.467 27.9922 146.384 29.5547 143.493 29.5547ZM143.337 16.4818C140.589 16.4818 138.597 18.5651 138.467 21.8855H148.193C148.063 18.526 146.097 16.4818 143.337 16.4818ZM150.056 29.3334L155.016 22.4584L150.081 15.7918H151.267L155.589 21.6902H155.616L159.939 15.7918H161.123L156.175 22.4323L161.097 29.3334H159.925L155.603 23.2527H155.563L151.228 29.3334H150.056ZM166.735 29.5547C164.092 29.5547 162.256 27.9792 162.256 25.6875V25.6615C162.256 23.3568 163.936 22.0287 167.048 21.7943L171.709 21.4688V20.2579C171.709 17.9011 170.289 16.4818 167.895 16.4818C165.616 16.4818 164.079 17.5886 163.74 19.5547L163.715 19.6979H162.737L162.764 19.5416C163.089 17.0678 165.004 15.5703 167.895 15.5703C170.876 15.5703 172.725 17.3412 172.725 20.1798V29.3334H171.709V26.4818H171.683C171.007 28.3047 169.001 29.5547 166.735 29.5547ZM163.285 25.6875C163.285 27.4323 164.783 28.6432 166.879 28.6432C169.548 28.6432 171.709 26.7292 171.709 24.3074V22.3022L167.191 22.6276C164.665 22.823 163.285 23.8776 163.285 25.6615V25.6875ZM175.628 29.3334V15.7918H176.644V18.5912H176.671C177.165 16.8855 178.597 15.5834 180.693 15.5834C182.829 15.5834 184.352 17.0027 184.756 18.7995H184.795C185.289 17.0547 186.813 15.5834 189.079 15.5834C191.696 15.5834 193.428 17.3803 193.428 20.1927V29.3334H192.412V20.4271C192.412 17.9922 191.071 16.4948 188.857 16.4948C186.579 16.4948 185.029 18.3047 185.029 20.9088V29.3334H184.027V20.388C184.027 18.0312 182.556 16.4948 180.485 16.4948C178.22 16.4948 176.644 18.3698 176.644 21.2474V29.3334H175.628ZM200.785 29.5547C197.868 29.5547 195.849 27.9011 195.589 25.5443L195.576 25.4271H196.579L196.605 25.5443C196.865 27.3803 198.48 28.6694 200.772 28.6694C203.103 28.6694 204.691 27.5104 204.691 25.8307V25.8178C204.691 24.3724 203.844 23.6303 201.671 23.1224L199.783 22.6798C197.204 22.0807 196.019 21.026 196.019 19.2552V19.2422C196.019 17.0938 197.947 15.5703 200.628 15.5703C203.401 15.5703 205.212 17.1719 205.485 19.5807L205.499 19.6979H204.521L204.508 19.6068C204.248 17.7058 202.789 16.4558 200.628 16.4558C198.519 16.4558 197.035 17.6146 197.035 19.2292V19.2422C197.035 20.5312 197.907 21.2864 200.081 21.7943L201.969 22.237C204.625 22.862 205.72 23.8907 205.72 25.7656V25.7787C205.72 28.0052 203.663 29.5547 200.785 29.5547Z"
                fill="black"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_621_1527"
                  x1="22.7764"
                  y1="7.55555"
                  x2="22.7764"
                  y2="32.4444"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#A1A1A1" />
                  <stop offset="1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Main Content - Form */}
          <div className="self-stretch p-4 rounded-tl-2xl rounded-br-2xl outline outline-[0.50px] outline-offset-[-0.50px] outline-black flex flex-col justify-start items-start gap-3">
            <div className="self-stretch h-12 inline-flex justify-between items-start">
              <div className="flex justify-start items-end gap-3">
                <div className="justify-start text-black text-base font-normal whitespace-nowrap">
                  Centre Number
                </div>
                <div className="flex justify-start items-start">
                  <div className="w-9 h-9 px-3 py-2 rounded-tl rounded-bl border border-r-0 border-black border-text-body flex items-center justify-center">
                    <span className="text-black font-['Shantell_sans'] text-[17px] font-bold">
                      M
                    </span>
                  </div>
                  <div className="w-9 h-9 px-3 py-2 border border-black border-r-0 border-text-body flex items-center justify-center">
                    <span className="text-black font-['Shantell_sans'] text-[17px] font-bold">
                      E
                    </span>
                  </div>
                  <div className="w-9 h-9 px-3 py-2 border border-black border-r-0 border-text-body flex items-center justify-center">
                    <span className="text-black font-['Shantell_sans'] text-[17px] font-bold">
                      D
                    </span>
                  </div>
                  <div className="w-9 h-9 px-3 py-2 border border-black border-r-0 border-text-body flex items-center justify-center">
                    <span className="text-black font-['Shantell_sans'] text-[17px] font-bold">
                      L
                    </span>
                  </div>
                  <div className="w-9 h-9 px-3 py-2 rounded-tr rounded-br border border-black border-text-body flex items-center justify-center">
                    <span className="text-black font-['Shantell_sans'] text-[17px] font-bold">
                      Y
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-start items-end gap-3 ml-8">
                <div className="justify-start text-black text-base font-normal whitespace-nowrap">
                  Candidate Number
                </div>
                <div className="flex justify-start items-start">
                  <div className="w-9 h-9 px-3 py-2 rounded-tl rounded-bl border border-black border-r-0  border-text-body" />
                  <div className="w-9 h-9 px-3 py-2 border border-black border-r-0  border-text-body" />
                  <div className="w-9 h-9 px-3 py-2 border border-black border-r-0  border-text-body" />
                  <div className="w-9 h-9 px-3 py-2 rounded-tr rounded-br border border-black border-text-body" />
                </div>
              </div>
            </div>
            <div className="self-stretch inline-flex justify-start items-start">
              <div className="w-28 justify-start text-black text-base font-normal ">
                Surname
              </div>
              <div className="flex-1 h-4 bg-white border-b-[0.50px] border-black flex items-end">
                <span className="text-black font-bold font-['Shantell_sans'] text-[17px]">
                  {user?.userName
                    ? capitalizeWords(user.userName.split(" ").pop() || "")
                    : ""}
                </span>
              </div>
            </div>
            <div className="self-stretch inline-flex justify-start items-start">
              <div className="w-28 justify-start text-black text-base font-normal ">
                Forename(s)
              </div>
              <div className="flex-1 h-4 bg-white border-b-[0.50px] border-black flex items-end">
                <span className="text-black font-bold font-['Shantell_sans'] text-[17px]">
                  {user?.userName
                    ? capitalizeWords(
                        user.userName.split(" ").slice(0, -1).join(" ") ||
                          user.userName
                      )
                    : ""}
                </span>
              </div>
            </div>
            <div className="self-stretch inline-flex justify-start items-start">
              <div className="w-28 justify-start text-black text-base font-normal ">
                Candidate Signature
              </div>
              <div className="flex-1 inline-flex flex-col justify-start items-start">
                <div className="self-stretch h-4 bg-white border-b-[0.50px] border-black" />
                <div className="justify-start text-black text-base font-normal ">
                  I declare this is my own work.
                </div>
              </div>
            </div>
          </div>

          {/* Exam Details */}
          <div className="flex flex-row justify-between w-full">
            <div className="self-stretch pt-5 justify-start text-black text-4xl font-heavy">
              {content.course}
              <br />
              {content.subject}
              {/* {content.series} */}
            </div>
          </div>
          {content.tier && (
            <div className="self-stretch justify-start text-black text-2xl font-heavy">
              {content.tier} Tier
            </div>
          )}
          <div className="self-stretch pb-5 border-b-2 border-black inline-flex justify-start items-start gap-4">
            <div className="justify-start text-black text-2xl font-heavy">
              PAPER {content.paper}
            </div>
          </div>
          <div className="self-stretch text-right justify-start text-black text-base font-normal ">
            Time allowed: {formatTimeAllowed(content.time)}
          </div>

          {/* Materials */}
          {content.subject.includes("Math") && (
            <div className="self-stretch flex flex-col justify-start items-start gap-1">
              <div className="self-stretch justify-start text-black text-2xl  font-heavy">
                Materials
              </div>
              <div className="self-stretch justify-start text-black text-base font-normal">
                For this paper you must have:
              </div>
              {content.subject.includes("Math") ? (
                <>
                  <div className="self-stretch justify-start text-black text-base font-normal">
                    • Ruler, calculator
                  </div>
                </>
              ) : (
                <>
                  <div className="self-stretch justify-start text-black text-base font-normal"></div>
                </>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <div className="self-stretch justify-start text-black text-2xl  font-heavy">
              Instructions
            </div>
            <div className="self-stretch justify-start">
              <span className="text-black text-base font-normal ">
                • Answer{" "}
              </span>
              <span className="text-black text-base">all</span>
              <span className="text-black text-base font-normal  leading-none">
                {" "}
                questions.
              </span>
            </div>
            <div className="justify-start text-black text-base font-normal">
              • Answer the questions in the spaces provided.
            </div>
            {!content.subject.includes("Eng") && (
              <div className="self-stretch justify-start text-black text-base font-normal">
                • In calculations, show clearly how you work out your answer.
              </div>
            )}
          </div>

          {/* Information */}
          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <div className="self-stretch justify-start text-black text-2xl  font-heavy">
              Information
            </div>
            <div className="justify-start">
              <span className="text-black text-base font-normal">
                • The marks for{" "}
              </span>
              <span className="text-black text-base ">each </span>
              <span className="text-black text-base font-normal  leading-none">
                question are shown in brackets
              </span>
            </div>
            <div className="justify-start text-black text-base font-normal  pl-4">
              - use this as a guide as to how much time to spend on each
              question.
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (content.examBoard == "Edexcel") {
    return (
      <div className="bg-white rounded-2xl overflow-visible min-w-[720px] max-w-[800px] mx-auto p-8 mt-8 border border-[#F2F2F7]">
        <div className="w-full flex flex-col justify-start items-center gap-4 mb-40">
          {/* Logo */}
          <div className="self-stretch flex justify-start items-center gap-2">
            <svg
              width="208"
              height="40"
              viewBox="0 0 208 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M40.1384 9.40139C38.4132 8.35532 30.1855 2.86809 17.6613 17.7887L15.422 20.1724C15.422 20.1724 4.7832 15.5338 1.1802 20.5788C-1.85526 24.8292 1.51749 29.2567 5.05886 29.2567C8.97426 29.2567 12.564 26.0519 15.1732 23.2626L23.9816 29.5132C26.6356 31.385 29.7376 32.4444 32.9059 32.4444C36.1572 32.4268 40.3373 31.438 43.1076 27.412C48.5673 19.162 43.6769 11.5468 40.1384 9.40139ZM5.74253 23.9411C5.56881 23.0204 5.99258 22.3098 6.60657 21.9946C8.49629 21.0244 12.9338 22.4679 12.9338 22.4679C12.9338 22.4679 9.73133 25.1999 7.59604 25.368C6.72999 25.4362 5.94694 25.0243 5.74253 23.9411ZM36.5713 19.0956C36.0737 21.9208 33.7675 25.3762 24.5455 22.9976C18.9055 21.4086 17.4555 20.7118 17.4555 20.7118C17.4555 20.7118 23.7209 13.7471 28.8584 12.9329C35.0803 11.9468 37.0691 16.2704 36.5713 19.0956Z"
                fill="url(#paint0_linear_621_1527)"
              />
              <path
                d="M59.3602 29.6068C58.2274 29.6068 57.4592 28.9167 57.4592 27.6276V17.0287C57.4592 15.7527 58.2144 15.0885 59.2951 15.0885C60.3759 15.0885 61.1311 15.7527 61.1311 17.0287V17.9011H61.2092C61.7951 16.2213 63.2926 15.1145 65.1935 15.1145C67.2118 15.1145 68.618 16.1563 69.0868 17.9792H69.165C69.7899 16.2213 71.4566 15.1145 73.5008 15.1145C76.2352 15.1145 78.0711 16.9896 78.0711 19.8021V27.6276C78.0711 28.9167 77.2899 29.6068 76.1571 29.6068C75.0374 29.6068 74.2691 28.9167 74.2691 27.6276V20.7527C74.2691 19.138 73.4618 18.2527 71.9904 18.2527C70.5451 18.2527 69.5946 19.3073 69.5946 20.8568V27.6276C69.5946 28.9167 68.8915 29.6068 67.7587 29.6068C66.6388 29.6068 65.9358 28.9167 65.9358 27.6276V20.6355C65.9358 19.138 65.0894 18.2527 63.6831 18.2527C62.2378 18.2527 61.2612 19.3464 61.2612 20.9088V27.6276C61.2612 28.9167 60.48 29.6068 59.3602 29.6068ZM86.8992 29.6328C82.5374 29.6328 79.9722 26.9375 79.9722 22.4193C79.9722 17.9271 82.5894 15.0755 86.717 15.0755C90.6754 15.0755 93.3316 17.7839 93.3316 21.5729C93.3316 22.6276 92.7326 23.2265 91.6779 23.2265H83.7092V23.3959C83.7092 25.4661 84.9592 26.8203 86.8863 26.8203C88.2795 26.8203 89.191 26.3516 90.2196 25.1407C90.6232 24.724 90.9618 24.5807 91.4566 24.5807C92.2768 24.5807 92.941 25.1016 92.941 25.974C92.941 26.2735 92.8498 26.586 92.6806 26.8984C91.756 28.6172 89.5946 29.6328 86.8992 29.6328ZM83.7483 20.8959H89.6727C89.5946 19.0729 88.4227 17.888 86.756 17.888C85.0894 17.888 83.8784 19.112 83.7483 20.8959ZM100.48 29.5547C96.9904 29.5547 94.7899 26.7943 94.7899 22.3281C94.7899 17.9011 97.0035 15.1536 100.506 15.1536C102.524 15.1536 104.087 16.2213 104.764 17.7708H104.842V12.25C104.842 10.9479 105.636 10.2578 106.743 10.2578C107.863 10.2578 108.644 10.9479 108.644 12.25V27.6797C108.644 28.9427 107.863 29.6068 106.756 29.6068C105.662 29.6068 104.842 28.9557 104.842 27.6797V26.8724H104.777C104.165 28.4349 102.628 29.5547 100.48 29.5547ZM101.769 26.4948C103.657 26.4948 104.868 24.9063 104.868 22.3541C104.868 19.8151 103.657 18.2005 101.769 18.2005C99.855 18.2005 98.6831 19.8021 98.6831 22.3541C98.6831 24.9193 99.855 26.4948 101.769 26.4948ZM113.175 29.6068C112.069 29.6068 111.274 28.9297 111.274 27.6276V12.25C111.274 10.9479 112.069 10.2578 113.175 10.2578C114.295 10.2578 115.076 10.9479 115.076 12.25V27.6276C115.076 28.9297 114.295 29.6068 113.175 29.6068ZM120.011 34.5027C118.345 34.5027 117.446 33.8645 117.446 32.7188C117.446 31.9505 117.98 31.4688 118.839 31.4688C119.1 31.4688 119.243 31.4817 119.504 31.4817C120.168 31.4817 120.884 31.1953 121.339 30.2188L121.535 29.724L117.082 17.9792C116.938 17.5885 116.86 17.1719 116.86 16.8593C116.86 15.8307 117.707 15.0885 118.826 15.0885C119.829 15.0885 120.35 15.5183 120.662 16.6251L123.696 26.2864H123.761L126.795 16.5989C127.108 15.5443 127.654 15.0885 128.631 15.0885C129.725 15.0885 130.48 15.8047 130.48 16.8073C130.48 17.1197 130.402 17.5625 130.272 17.9271L125.988 29.5677C124.686 33.1745 123.071 34.5027 120.011 34.5027Z"
                fill="black"
              />
              <path
                d="M143.493 29.5547C139.821 29.5547 137.452 26.9115 137.452 22.5755V22.5626C137.452 18.2527 139.835 15.5703 143.349 15.5703C146.852 15.5703 149.196 18.2006 149.196 22.2631V22.7318H138.467C138.519 26.5339 140.511 28.6432 143.507 28.6432C145.863 28.6432 147.477 27.4454 147.972 25.5574L148.011 25.4531H149.027L149.001 25.5703C148.467 27.9922 146.384 29.5547 143.493 29.5547ZM143.337 16.4818C140.589 16.4818 138.597 18.5651 138.467 21.8855H148.193C148.063 18.526 146.097 16.4818 143.337 16.4818ZM150.056 29.3334L155.016 22.4584L150.081 15.7918H151.267L155.589 21.6902H155.616L159.939 15.7918H161.123L156.175 22.4323L161.097 29.3334H159.925L155.603 23.2527H155.563L151.228 29.3334H150.056ZM166.735 29.5547C164.092 29.5547 162.256 27.9792 162.256 25.6875V25.6615C162.256 23.3568 163.936 22.0287 167.048 21.7943L171.709 21.4688V20.2579C171.709 17.9011 170.289 16.4818 167.895 16.4818C165.616 16.4818 164.079 17.5886 163.74 19.5547L163.715 19.6979H162.737L162.764 19.5416C163.089 17.0678 165.004 15.5703 167.895 15.5703C170.876 15.5703 172.725 17.3412 172.725 20.1798V29.3334H171.709V26.4818H171.683C171.007 28.3047 169.001 29.5547 166.735 29.5547ZM163.285 25.6875C163.285 27.4323 164.783 28.6432 166.879 28.6432C169.548 28.6432 171.709 26.7292 171.709 24.3074V22.3022L167.191 22.6276C164.665 22.823 163.285 23.8776 163.285 25.6615V25.6875ZM175.628 29.3334V15.7918H176.644V18.5912H176.671C177.165 16.8855 178.597 15.5834 180.693 15.5834C182.829 15.5834 184.352 17.0027 184.756 18.7995H184.795C185.289 17.0547 186.813 15.5834 189.079 15.5834C191.696 15.5834 193.428 17.3803 193.428 20.1927V29.3334H192.412V20.4271C192.412 17.9922 191.071 16.4948 188.857 16.4948C186.579 16.4948 185.029 18.3047 185.029 20.9088V29.3334H184.027V20.388C184.027 18.0312 182.556 16.4948 180.485 16.4948C178.22 16.4948 176.644 18.3698 176.644 21.2474V29.3334H175.628ZM200.785 29.5547C197.868 29.5547 195.849 27.9011 195.589 25.5443L195.576 25.4271H196.579L196.605 25.5443C196.865 27.3803 198.48 28.6694 200.772 28.6694C203.103 28.6694 204.691 27.5104 204.691 25.8307V25.8178C204.691 24.3724 203.844 23.6303 201.671 23.1224L199.783 22.6798C197.204 22.0807 196.019 21.026 196.019 19.2552V19.2422C196.019 17.0938 197.947 15.5703 200.628 15.5703C203.401 15.5703 205.212 17.1719 205.485 19.5807L205.499 19.6979H204.521L204.508 19.6068C204.248 17.7058 202.789 16.4558 200.628 16.4558C198.519 16.4558 197.035 17.6146 197.035 19.2292V19.2422C197.035 20.5312 197.907 21.2864 200.081 21.7943L201.969 22.237C204.625 22.862 205.72 23.8907 205.72 25.7656V25.7787C205.72 28.0052 203.663 29.5547 200.785 29.5547Z"
                fill="black"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_621_1527"
                  x1="22.7764"
                  y1="7.55555"
                  x2="22.7764"
                  y2="32.4444"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#A1A1A1" />
                  <stop offset="1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Main Content */}
          <div className="self-stretch p-4 rounded-2xl border-[2px] border-[#1C1C1E] flex flex-col justify-start items-start gap-2.5">
            {/* Candidate Name and Other Names */}
            <div className="self-stretch flex justify-start items-start">
              <div className="flex-1 h-20 px-4 py-2 rounded-tl-lg rounded-bl-lg border-r-[0px] border-[2px] border-[#1C1C1E] flex flex-col justify-start items-start">
                <div className="text-black text-base mb-2">Candidate Name</div>
                <div className="text-black text-lg font-bold">
                  {user?.userName ? capitalizeWords(user.userName) : ""}
                </div>
              </div>
              <div className="flex-1 h-20 px-4 py-2 rounded-tr-lg rounded-br-lg border-[2px] border-[#1C1C1E] flex flex-col justify-start items-start">
                <div className="text-black text-base mb-2">Other Names</div>
                {user?.avatar && <div className="text-2xl">{user.avatar}</div>}
              </div>
            </div>

            {/* Centre Number and Candidate Number */}
            <div className="self-stretch flex justify-start items-start gap-2.5">
              {/* Centre Number */}
              <div className="flex flex-col justify-start items-start gap-1">
                <div className="text-black text-base">Centre Number</div>
                <div className="flex justify-start items-start">
                  <div className="w-14 h-14 rounded-tl rounded-bl border-[2px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="text-black text-lg font-bold">M</span>
                  </div>
                  <div className="w-14 h-14 border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="text-black text-lg font-bold">E</span>
                  </div>
                  <div className="w-14 h-14 border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="text-black text-lg font-bold">D</span>
                  </div>
                  <div className="w-14 h-14 border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="text-black text-lg font-bold">L</span>
                  </div>
                  <div className="w-14 h-14 rounded-tr rounded-br border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="text-black text-lg font-bold">Y</span>
                  </div>
                </div>
              </div>

              {/* Candidate Number */}
              <div className="flex flex-col justify-start items-start gap-1">
                <div className="text-black text-base">Candidate Number</div>
                <div className="flex justify-start items-start">
                  <div className="w-14 h-14 rounded-tl rounded-bl border-[2px] border-[#1C1C1E]"></div>
                  <div className="w-14 h-14 border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E]"></div>
                  <div className="w-14 h-14 border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E]"></div>
                  <div className="w-14 h-14 border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E]"></div>
                  <div className="w-14 h-14 rounded-tr rounded-br border-t-[2px] border-b-[2px] border-r-[2px] border-[#1C1C1E]"></div>
                </div>
              </div>
            </div>

            {/* Exam Title */}
            <div className="self-stretch text-black text-2xl font-heavy py-2">
              Medly Edexcel {content.course}
            </div>

            {/* Exam Date */}
            <div className="self-stretch px-4 py-0 rounded-lg border-[2px] border-[#1C1C1E] flex flex-col justify-start items-start">
              <div className="self-stretch text-black text-4xl font-heavy leading-loose">
                {content.date}
              </div>
            </div>

            {/* Time */}
            <div className="text-black text-base">
              Time: {formatTimeAllowed(content.time)}
            </div>

            {/* Subject and Paper */}
            <div className="self-stretch px-4 py-4 rounded-lg border-[2px] border-[#1C1C1E] flex flex-col justify-start items-start">
              <div className="self-stretch text-black text-4xl font-heavy mb-2">
                {content.subject}
                {/* {content.series} */}
              </div>
              {!content.subject.includes("Eng") && content.tier && (
                <div className="self-stretch flex justify-end items-start">
                  <div className="text-black text-xl font-heavy">
                    {content.tier} Tier
                  </div>
                </div>
              )}
              <div className="self-stretch flex justify-start items-start">
                <div className="text-black text-xl font-heavy">
                  PAPER {content.paper}
                </div>
              </div>
            </div>

            {/* Materials and Total Marks */}
            <div className="self-stretch flex gap-2 ">
              <div className="flex-1 p-4 rounded-lg border-[2px] border-[#1C1C1E] flex flex-col justify-start items-start gap-1">
                <div className="self-stretch flex justify-start items-start">
                  <div className="text-black text-2xl font-heavy">
                    You must have:
                  </div>
                </div>
                {content.subject.includes("Math") ? (
                  <div className="text-black text-base">Ruler, calculator</div>
                ) : (
                  <div className="text-black text-base"></div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="self-stretch flex flex-col justify-start items-start gap-2 mb-4">
            <div className="self-stretch text-black text-2xl font-heavy">
              Instructions
            </div>
            <ul className="list-disc pl-5 space-y-2 w-full">
              <li className="text-black text-base">
                <span>Answer </span>
                <span className="font-heavy">all</span>
                <span> questions.</span>
              </li>
              <li className="text-black text-base">
                Answer the questions in the spaces provided. When you&apos;re
                ready to submit your completed paper, click &quot;Submit&quot;
                at the end of the paper.
              </li>
              <li className="text-black text-base">
                You should show all your working and use appropriate units.
              </li>
            </ul>
          </div>

          {/* Information */}
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            <div className="self-stretch text-black text-2xl font-heavy">
              Information
            </div>
            <ul className="list-disc pl-5 space-y-2 w-full">
              <li className="text-black text-base">
                <span>The marks for </span>
                <span className="font-heavy">each </span>
                <span>question are shown in brackets</span>
                <div className="pl-4">
                  - use this as a guide as to how much time to spend on each
                  question.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  if (content.examBoard === "OCR") {
    return (
      <div className="bg-white rounded-2xl overflow-visible min-w-[720px] max-w-[800px] mx-auto mt-8 border border-[#F2F2F7]">
        <div className="w-full flex flex-col justify-start items-left gap-4 p-16 pl-20 mb-40">
          {/* Logo */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            <svg
              width="208"
              height="40"
              viewBox="0 0 208 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M40.1384 9.40139C38.4132 8.35532 30.1855 2.86809 17.6613 17.7887L15.422 20.1724C15.422 20.1724 4.7832 15.5338 1.1802 20.5788C-1.85526 24.8292 1.51749 29.2567 5.05886 29.2567C8.97426 29.2567 12.564 26.0519 15.1732 23.2626L23.9816 29.5132C26.6356 31.385 29.7376 32.4444 32.9059 32.4444C36.1572 32.4268 40.3373 31.438 43.1076 27.412C48.5673 19.162 43.6769 11.5468 40.1384 9.40139ZM5.74253 23.9411C5.56881 23.0204 5.99258 22.3098 6.60657 21.9946C8.49629 21.0244 12.9338 22.4679 12.9338 22.4679C12.9338 22.4679 9.73133 25.1999 7.59604 25.368C6.72999 25.4362 5.94694 25.0243 5.74253 23.9411ZM36.5713 19.0956C36.0737 21.9208 33.7675 25.3762 24.5455 22.9976C18.9055 21.4086 17.4555 20.7118 17.4555 20.7118C17.4555 20.7118 23.7209 13.7471 28.8584 12.9329C35.0803 11.9468 37.0691 16.2704 36.5713 19.0956Z"
                fill="url(#paint0_linear_621_1527)"
              />
              <path
                d="M59.3602 29.6068C58.2274 29.6068 57.4592 28.9167 57.4592 27.6276V17.0287C57.4592 15.7527 58.2144 15.0885 59.2951 15.0885C60.3759 15.0885 61.1311 15.7527 61.1311 17.0287V17.9011H61.2092C61.7951 16.2213 63.2926 15.1145 65.1935 15.1145C67.2118 15.1145 68.618 16.1563 69.0868 17.9792H69.165C69.7899 16.2213 71.4566 15.1145 73.5008 15.1145C76.2352 15.1145 78.0711 16.9896 78.0711 19.8021V27.6276C78.0711 28.9167 77.2899 29.6068 76.1571 29.6068C75.0374 29.6068 74.2691 28.9167 74.2691 27.6276V20.7527C74.2691 19.138 73.4618 18.2527 71.9904 18.2527C70.5451 18.2527 69.5946 19.3073 69.5946 20.8568V27.6276C69.5946 28.9167 68.8915 29.6068 67.7587 29.6068C66.6388 29.6068 65.9358 28.9167 65.9358 27.6276V20.6355C65.9358 19.138 65.0894 18.2527 63.6831 18.2527C62.2378 18.2527 61.2612 19.3464 61.2612 20.9088V27.6276C61.2612 28.9167 60.48 29.6068 59.3602 29.6068ZM86.8992 29.6328C82.5374 29.6328 79.9722 26.9375 79.9722 22.4193C79.9722 17.9271 82.5894 15.0755 86.717 15.0755C90.6754 15.0755 93.3316 17.7839 93.3316 21.5729C93.3316 22.6276 92.7326 23.2265 91.6779 23.2265H83.7092V23.3959C83.7092 25.4661 84.9592 26.8203 86.8863 26.8203C88.2795 26.8203 89.191 26.3516 90.2196 25.1407C90.6232 24.724 90.9618 24.5807 91.4566 24.5807C92.2768 24.5807 92.941 25.1016 92.941 25.974C92.941 26.2735 92.8498 26.586 92.6806 26.8984C91.756 28.6172 89.5946 29.6328 86.8992 29.6328ZM83.7483 20.8959H89.6727C89.5946 19.0729 88.4227 17.888 86.756 17.888C85.0894 17.888 83.8784 19.112 83.7483 20.8959ZM100.48 29.5547C96.9904 29.5547 94.7899 26.7943 94.7899 22.3281C94.7899 17.9011 97.0035 15.1536 100.506 15.1536C102.524 15.1536 104.087 16.2213 104.764 17.7708H104.842V12.25C104.842 10.9479 105.636 10.2578 106.743 10.2578C107.863 10.2578 108.644 10.9479 108.644 12.25V27.6797C108.644 28.9427 107.863 29.6068 106.756 29.6068C105.662 29.6068 104.842 28.9557 104.842 27.6797V26.8724H104.777C104.165 28.4349 102.628 29.5547 100.48 29.5547ZM101.769 26.4948C103.657 26.4948 104.868 24.9063 104.868 22.3541C104.868 19.8151 103.657 18.2005 101.769 18.2005C99.855 18.2005 98.6831 19.8021 98.6831 22.3541C98.6831 24.9193 99.855 26.4948 101.769 26.4948ZM113.175 29.6068C112.069 29.6068 111.274 28.9297 111.274 27.6276V12.25C111.274 10.9479 112.069 10.2578 113.175 10.2578C114.295 10.2578 115.076 10.9479 115.076 12.25V27.6276C115.076 28.9297 114.295 29.6068 113.175 29.6068ZM120.011 34.5027C118.345 34.5027 117.446 33.8645 117.446 32.7188C117.446 31.9505 117.98 31.4688 118.839 31.4688C119.1 31.4688 119.243 31.4817 119.504 31.4817C120.168 31.4817 120.884 31.1953 121.339 30.2188L121.535 29.724L117.082 17.9792C116.938 17.5885 116.86 17.1719 116.86 16.8593C116.86 15.8307 117.707 15.0885 118.826 15.0885C119.829 15.0885 120.35 15.5183 120.662 16.6251L123.696 26.2864H123.761L126.795 16.5989C127.108 15.5443 127.654 15.0885 128.631 15.0885C129.725 15.0885 130.48 15.8047 130.48 16.8073C130.48 17.1197 130.402 17.5625 130.272 17.9271L125.988 29.5677C124.686 33.1745 123.071 34.5027 120.011 34.5027Z"
                fill="black"
              />
              <path
                d="M143.493 29.5547C139.821 29.5547 137.452 26.9115 137.452 22.5755V22.5626C137.452 18.2527 139.835 15.5703 143.349 15.5703C146.852 15.5703 149.196 18.2006 149.196 22.2631V22.7318H138.467C138.519 26.5339 140.511 28.6432 143.507 28.6432C145.863 28.6432 147.477 27.4454 147.972 25.5574L148.011 25.4531H149.027L149.001 25.5703C148.467 27.9922 146.384 29.5547 143.493 29.5547ZM143.337 16.4818C140.589 16.4818 138.597 18.5651 138.467 21.8855H148.193C148.063 18.526 146.097 16.4818 143.337 16.4818ZM150.056 29.3334L155.016 22.4584L150.081 15.7918H151.267L155.589 21.6902H155.616L159.939 15.7918H161.123L156.175 22.4323L161.097 29.3334H159.925L155.603 23.2527H155.563L151.228 29.3334H150.056ZM166.735 29.5547C164.092 29.5547 162.256 27.9792 162.256 25.6875V25.6615C162.256 23.3568 163.936 22.0287 167.048 21.7943L171.709 21.4688V20.2579C171.709 17.9011 170.289 16.4818 167.895 16.4818C165.616 16.4818 164.079 17.5886 163.74 19.5547L163.715 19.6979H162.737L162.764 19.5416C163.089 17.0678 165.004 15.5703 167.895 15.5703C170.876 15.5703 172.725 17.3412 172.725 20.1798V29.3334H171.709V26.4818H171.683C171.007 28.3047 169.001 29.5547 166.735 29.5547ZM163.285 25.6875C163.285 27.4323 164.783 28.6432 166.879 28.6432C169.548 28.6432 171.709 26.7292 171.709 24.3074V22.3022L167.191 22.6276C164.665 22.823 163.285 23.8776 163.285 25.6615V25.6875ZM175.628 29.3334V15.7918H176.644V18.5912H176.671C177.165 16.8855 178.597 15.5834 180.693 15.5834C182.829 15.5834 184.352 17.0027 184.756 18.7995H184.795C185.289 17.0547 186.813 15.5834 189.079 15.5834C191.696 15.5834 193.428 17.3803 193.428 20.1927V29.3334H192.412V20.4271C192.412 17.9922 191.071 16.4948 188.857 16.4948C186.579 16.4948 185.029 18.3047 185.029 20.9088V29.3334H184.027V20.388C184.027 18.0312 182.556 16.4948 180.485 16.4948C178.22 16.4948 176.644 18.3698 176.644 21.2474V29.3334H175.628ZM200.785 29.5547C197.868 29.5547 195.849 27.9011 195.589 25.5443L195.576 25.4271H196.579L196.605 25.5443C196.865 27.3803 198.48 28.6694 200.772 28.6694C203.103 28.6694 204.691 27.5104 204.691 25.8307V25.8178C204.691 24.3724 203.844 23.6303 201.671 23.1224L199.783 22.6798C197.204 22.0807 196.019 21.026 196.019 19.2552V19.2422C196.019 17.0938 197.947 15.5703 200.628 15.5703C203.401 15.5703 205.212 17.1719 205.485 19.5807L205.499 19.6979H204.521L204.508 19.6068C204.248 17.7058 202.789 16.4558 200.628 16.4558C198.519 16.4558 197.035 17.6146 197.035 19.2292V19.2422C197.035 20.5312 197.907 21.2864 200.081 21.7943L201.969 22.237C204.625 22.862 205.72 23.8907 205.72 25.7656V25.7787C205.72 28.0052 203.663 29.5547 200.785 29.5547Z"
                fill="black"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_621_1527"
                  x1="22.7764"
                  y1="7.55555"
                  x2="22.7764"
                  y2="32.4444"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#A1A1A1" />
                  <stop offset="1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Date and Exam Info with Background */}
          <div
            className="self-stretch flex flex-col gap-4 bg-no-repeat p-0 rounded-lg rounded-bl-3xl"
            style={{
              backgroundImage: "url(/OCR_Cover_Page.png)",
              backgroundSize: "contain",
              backgroundPosition: "center 60%",
            }}
          >
            <div className="self-stretch text-black text-3xl font-heavy">
              {(() => {
                // Always use current date and time when they start the paper
                const now = new Date();
                const timeOfDay =
                  now.getHours() < 12
                    ? "Morning"
                    : now.getHours() < 17
                      ? "Afternoon"
                      : "Evening";
                return `${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} - ${timeOfDay}`;
              })()}
            </div>
            <div className="self-stretch text-black text-2xl font-heavy leading-none">
              {content.course} {content.subject}
            </div>
            {content.tier && (
              <div className="self-stretch text-black text-xl font-heavy leading-none">
                {content.tier} Tier
              </div>
            )}
            <div className="self-stretch text-black text-xl font-normal leading-none">
              {/* <span className="font-heavy">{content.series}</span>  */}
              Paper {content.paper}
            </div>
            <div className="self-stretch flex justify-between items-center">
              <div className="text-black text-base font-heavy leading-none">
                Time allowed: {formatTimeAllowed(content.time)}
              </div>
            </div>

            {/* Materials and Instructions Box */}
            <div className="w-1/2 p-2 pb-14 rounded-lg border border-black flex flex-col justify-start items-start gap-0 bg-white">
              <div className="self-stretch flex flex-col justify-start items-start gap-0">
                <div className="text-black text-sm font-heavy">
                  You must have:
                </div>
                <div className="text-black text-sm font-normal">
                  • the Data Sheet for {content.subject}
                </div>
              </div>

              {!content.subject.includes("Math") || content.paper !== "5" ? (
                <div className="self-stretch flex flex-col justify-start items-start gap-0">
                  <div className="text-black text-sm font-heavy">
                    You can use:
                  </div>
                  <div className="text-black text-sm font-normal">
                    • a scientific or graphical calculator
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Form Fields */}
          <div className="self-stretch py-4 px-2 rounded-2xl border border-black flex flex-col justify-start items-start gap-4">
            <div className="text-black text-base font-normal">
              Please write clearly in black ink.
            </div>

            <div className="self-stretch flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-black text-base font-normal whitespace-nowrap">
                  Centre Number
                </div>
                <div className="flex justify-start items-start">
                  <div className="w-9 h-9 rounded-tl rounded-bl border-[1px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="font-['Shantell_Sans'] text-black text-[17px] font-bold">
                      M
                    </span>
                  </div>
                  <div className="w-9 h-9 border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="font-['Shantell_Sans'] text-black text-[17px] font-bold">
                      E
                    </span>
                  </div>
                  <div className="w-9 h-9 border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="font-['Shantell_Sans'] text-black text-[17px] font-bold">
                      D
                    </span>
                  </div>
                  <div className="w-9 h-9 border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="font-['Shantell_Sans'] text-black text-[17px] font-bold">
                      L
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-tr rounded-br border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E] flex items-center justify-center">
                    <span className="font-['Shantell_Sans'] text-black text-[17px] font-bold">
                      Y
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-black text-base font-normal whitespace-nowrap">
                  Candidate Number
                </div>
                <div className="flex justify-start items-start">
                  <div className="w-9 h-9 rounded-tl rounded-bl border-[1px] border-[#1C1C1E]"></div>
                  <div className="w-9 h-9 border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E]"></div>
                  <div className="w-9 h-9 border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E]"></div>
                  <div className="w-9 h-9 border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E]"></div>
                  <div className="w-9 h-9 rounded-tr rounded-br border-t-[1px] border-b-[1px] border-r-[1px] border-[#1C1C1E]"></div>
                </div>
              </div>
            </div>

            <div className="self-stretch flex items-center gap-4">
              <div className="text-black text-base font-normal w-24">
                First name(s)
              </div>
              <div className="flex-1 border-b border-black h-6"></div>
            </div>

            <div className="self-stretch flex items-center gap-4">
              <div className="text-black text-base font-normal w-24">
                Last name
              </div>
              <div className="flex-1 border-b border-black h-6"></div>
            </div>
          </div>

          {/* Instructions */}
          <div className="self-stretch flex flex-col justify-start items-start">
            <div className="text-black text-lg font-heavy">INSTRUCTIONS</div>
            <div className="text-black text-base font-normal leading-none -mt-1">
              <span className="text-xl leading-none">•</span> Write your answer
              to each question in the space provided.
            </div>
            <div className="text-black text-base font-normal leading-none">
              <span className="text-xl leading-none">•</span> Answer{" "}
              <span className="font-bold">all</span> the questions.
            </div>
            <div className="text-black text-base font-normal leading-none">
              <span className="text-xl leading-none">•</span> Where appropriate,
              your answer should be supported with working. Marks might be given
              for using a correct method, even if your answer is wrong.
            </div>
          </div>
          {/* Information */}
          <div className="self-stretch flex flex-col justify-start items-start mt-1">
            <div className="text-black text-lg font-heavy">INFORMATION</div>
            <div className="text-black text-base font-normal leading-none">
              <span className="text-xl leading-none">•</span> The marks for each
              question are shown in brackets{" "}
              <span className="font-bold">[ ]</span>.
            </div>
            <div className="text-black text-base font-normal leading-none">
              <span className="text-xl leading-none">•</span> Quality of
              extended response will be assessed in questions marked with an
              asterisk (*).
            </div>
            <div className="text-black text-base font-normal leading-none">
              <span className="text-xl leading-none">•</span> This document has{" "}
              <span className="font-bold">32</span> pages.
            </div>
          </div>
          {/* Advice */}
          <div className="self-stretch flex flex-col justify-start items-start mt-1">
            <div className="text-black text-lg font-heavy">ADVICE</div>
            <div className="text-black text-base font-normal leading-none -mt-1">
              <span className="text-xl leading-none">•</span> Read each question
              carefully before you start your answer.
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default PaperCover;
