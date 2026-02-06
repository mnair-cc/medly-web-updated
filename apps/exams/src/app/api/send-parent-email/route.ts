import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createPaymentLink } from "@/app/_lib/utils/stripeUtils";

const resend = new Resend(process.env.RESEND_API_KEY);

const PRICE_IDS = {
  block2027: process.env.STRIPE_PRICE_ID_BLOCK_ANNUAL_2027!,
  block2026: process.env.STRIPE_PRICE_ID_BLOCK_ANNUAL!,
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
};

const PRICING_CONFIG = {
  block2027: {
    price: "200",
    originalPrice: "575",
    savings: "65%",
    billingNote:
      "One-time payment. Get unlimited access until the 31st of July 2027.",
    ctaText: "Get Exam Access",
    ctaBackground: "linear-gradient(to right, #05B0FF, #007AFF)",
  },
  block2026: {
    price: "125",
    originalPrice: "300",
    savings: "58%",
    billingNote:
      "One-time payment. Get unlimited access until the 31st of July 2026.",
    ctaText: "Get Exam Access",
    ctaBackground: "linear-gradient(to right, #05B0FF, #007AFF)",
  },
};

export async function POST(request: Request) {
  try {
    const { email, studentName, uid } = await request.json();

    const pricing = PRICING_CONFIG;

    // Create both payment links with the user ID in metadata
    const block2027PaymentLink = await createPaymentLink(
      uid,
      PRICE_IDS.block2027,
      email // Prefill customer email
    );

    const block2026PaymentLink = await createPaymentLink(
      uid,
      PRICE_IDS.block2026,
      email // Prefill customer email
    );

    const monthlyPaymentLink = await createPaymentLink(
      uid,
      PRICE_IDS.monthly,
      email // Prefill customer email
    );

    const { data, error } = await resend.emails.send({
      from: "Medly <no-reply@medlyai.com>",
      to: [email],
      subject: `${studentName} needs help with their exams`,
      html: `
        <div style="font-family: 'Circular', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; color: #484848; background-color: white;">
          <!-- Header -->
          <div style="padding: 24px 24px 0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="http://app.medlyai.com/logo_square_black.png" alt="Medly AI Logo" style="width: 80px; height: auto; margin-bottom: 16px;">
              <h1 style="color: black; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Help ${studentName} Excel in Their Exams</h1>
            </div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 0 24px;">
            <p style="font-size: 16px; line-height: 1.5; color: #484848; margin-bottom: 20px;">Dear Parent or Guardian,</p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #484848; margin-bottom: 28px;">${studentName} has expressed interest in using <span style="font-weight: 600; color: black;">Medly AI</span> to support their exam studies. Our platform provides 1:1 personalized learning through advanced AI technology.</p>
            
            <!-- Demo GIF -->
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fswitch_demo.gif?alt=media&token=cd613de6-489d-46c8-b2c6-e6ea77a4eddf" alt="Medly AI Demo" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            </div>
            
            <!-- Feature Cards -->
            <div style="margin-bottom: 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top: 2px;">
                          <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #484848; padding-left: 10px;">Unlimited access to over 10,000 exam-style questions for each topic of their exam board's specification</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top: 2px;">
                          <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #484848; padding-left: 10px;">Instant AI marking and tailored feedback from official exam board markschemes</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top: 2px;">
                          <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #484848; padding-left: 10px;">24/7 step by step tutoring that builds your child's subject understanding and exam confidence</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top: 2px;">
                          <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #484848; padding-left: 10px;">20+ timed mock practice papers per subject</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top: 2px;">
                          <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #484848; padding-left: 10px;">Comprehensive yet concise notes from each topic on their curriculum</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="20" valign="top" style="padding-top: 2px;">
                          <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                        </td>
                        <td style="font-size: 15px; color: #484848; padding-left: 10px;">Exam-focused preparation aligned with upcoming exams</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>
            
            <!-- Testimonials -->
            <div style="margin-bottom: 32px;">
              <div style="padding: 24px; background-color: rgba(244, 249, 253, 1); border-radius: 12px; margin-bottom: 16px;">
                <p style="font-size: 16px; line-height: 1.5; color: #484848; margin: 0 0 12px; font-style: italic;">
                  "It's brilliant! My daughter is quite an independent learner and this is the first tool my daughter has ever requested a subscription for. I don't know much about AI stuff so I was skeptical at first, but after she showed me how Medly was helping her, I was sold. 
                  <br><br>
                  Medly helped her understand immediately where she went wrong, and how she could have improved her answer to get all the marks for that exam question, step-by-step, just like how a personal tutor would."
                </p>
                <p style="font-size: 14px; font-weight: 600; color: #767676; margin: 0;">Samantha, Mother of Year 10 Student</p>
              </div>
              
              <div style="padding: 24px; background-color: rgba(244, 249, 253, 1); border-radius: 12px;">
                <p style="font-size: 16px; line-height: 1.5; color: #484848; margin: 0 0 12px; font-style: italic;">
                  "I normally struggle to focus in class and learn by myself. I also didn't want to ask for personal tutoring because of how expensive it can be, so I decided to give Medly a try.
                  <br><br>
                  On the first day, I completed 30 Physics questions in a row, I was shocked. Medly feels like a good tutor. It gives me feedback on how to improve my answer for the exam and I'm actually engaged because it feels like I'm having a conversation. I love using it, more than Cognito or Seneca, the feedback it gives just feels so helpful for the exam."
                </p>
                <p style="font-size: 14px; font-weight: 600; color: #767676; margin: 0;">Sarah, Year 11 Student</p>
              </div>
            </div>
            
            

            <!-- Call to Action -->
            <div style="background-color: transparent; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <!-- Pricing Section -->
              <div style="margin-bottom: 24px; text-align: center;">
                <h3 style="font-size: 20px; font-weight: 600; color: #1C1C1E; margin-bottom: 16px;">Choose a plan that works for ${studentName}</h3>
                
                <div style="width: 100%; max-width: 500px; margin: 0 auto 16px auto;">

                  <!-- 2027 Exams Plan -->
                  <div style="border-radius: 16px; overflow: hidden; border: 1px solid #E6E6E6; margin-bottom: 16px;">
                    <div style="padding: 16px; background-image: linear-gradient(to right, #05B0FF, #007AFF); color: white; text-align: left;">
                      <div style="display: flex; align-items: start;">
                        <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">2027 Exams</div>
                        <div style="padding: 8px 12px; border-radius: 999px; background-color: white; font-size: 12px; color: #FF686F; font-weight: 500; margin-left: 16px;">Save ${pricing.block2027.savings}</div>
                      </div>
                      
                      <div style="display: flex; flex-direction: column; align-items: flex-start; margin-top: 8px;">
                        <span style="font-size: 64px; font-weight: 700; color: white; line-height: 1;">£${pricing.block2027.price}</span>
                        <span style="font-size: 15px; color: rgba(255,255,255,0.5); text-decoration: line-through; margin-top: 4px; margin-bottom: 8px;">£${pricing.block2027.originalPrice}</span>
                      </div>
                      
                      <div style="margin-bottom: 16px; font-size: 14px; color: white; text-align: left;">
                        ${pricing.block2027.billingNote}
                      </div>
                    </div>
                    
                    <div style="padding: 24px; text-align: left;">
                      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 24px;">
                        <tr style="margin-bottom: 16px; display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Unlimited access to over 10,000 exam-style questions aligned with your child's exam.
                          </td>
                        </tr>
                        <tr style="margin-bottom: 16px; display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            24/7 step by step tutoring that builds your child's subject understanding and exam confidence.
                          </td>
                        </tr>
                        <tr style="display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Access to all 14 subjects from AQA and Edexcel GCSE and A Level.
                          </td>
                        </tr>
                      </table>
                      
                      <a href="${block2027PaymentLink}" style="display: block; width: 100%; padding: 16px 0; border-radius: 9999px; font-weight: 500; font-size: 15px; background-image: ${pricing.block2027.ctaBackground}; color: white; text-decoration: none; text-align: center;">${pricing.block2027.ctaText}</a>
                    </div>
                  </div>


        <!-- 2026 Exams Plan -->
                  <div style="border-radius: 16px; overflow: hidden; border: 1px solid #E6E6E6; margin-bottom: 16px;">
                    <div style="padding: 16px; background-image: linear-gradient(to right, #05B0FF, #007AFF); color: white; text-align: left;">
                      <div style="display: flex; align-items: start;">
                        <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">2026 Exams</div>
                        <div style="padding: 8px 12px; border-radius: 999px; background-color: white; font-size: 12px; color: #FF686F; font-weight: 500; margin-left: 16px;">Save ${pricing.block2026.savings}</div>
                      </div>
                      
                      <div style="display: flex; flex-direction: column; align-items: flex-start; margin-top: 8px;">
                        <span style="font-size: 64px; font-weight: 700; color: white; line-height: 1;">£${pricing.block2026.price}</span>
                        <span style="font-size: 15px; color: rgba(255,255,255,0.5); text-decoration: line-through; margin-top: 4px; margin-bottom: 8px;">£${pricing.block2026.originalPrice}</span>
                      </div>
                      
                      <div style="margin-bottom: 16px; font-size: 14px; color: white; text-align: left;">
                        ${pricing.block2026.billingNote}
                      </div>
                    </div>
                    
                    <div style="padding: 24px; text-align: left;">
                      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 24px;">
                        <tr style="margin-bottom: 16px; display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Unlimited access to over 10,000 exam-style questions aligned with your child's exam.
                          </td>
                        </tr>
                        <tr style="margin-bottom: 16px; display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            24/7 step by step tutoring that builds your child's subject understanding and exam confidence.
                          </td>
                        </tr>
                        <tr style="display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #05B0FF; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Access to all 14 subjects from AQA and Edexcel GCSE and A Level.
                          </td>
                        </tr>
                      </table>
                      
                      <a href="${block2026PaymentLink}" style="display: block; width: 100%; padding: 16px 0; border-radius: 9999px; font-weight: 500; font-size: 15px; background-image: ${pricing.block2026.ctaBackground}; color: white; text-decoration: none; text-align: center;">${pricing.block2026.ctaText}</a>
                    </div>
                  </div>
                  
                  <!-- Monthly Plan -->
                  <div style="border-radius: 16px; overflow: hidden; border: 1px solid #E6E6E6;">
                    <div style="padding: 16px; background-color: white; text-align: left;">
                      <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: rgba(0,0,0,0.3);">Monthly</div>
                      
                      <div style="display: flex; flex-direction: column; align-items: flex-start; margin-top: 8px;">
                        <span style="font-size: 64px; font-weight: 700; color: #818181; line-height: 1;">£24.99</span>
                        <span style="font-size: 15px; color: #818181; margin-top: 4px;">/month</span>
                      </div>
                    </div>
                    
                    <div style="padding: 24px; text-align: left;">
                      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 24px;">
                        <tr style="margin-bottom: 16px; display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #BCBCBE; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Unlimited access to all exam-style questions and features
                          </td>
                        </tr>
                        <tr style="margin-bottom: 16px; display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #BCBCBE; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Flexible monthly billing
                          </td>
                        </tr>
                        <tr style="display: block;">
                          <td width="20" valign="top" style="padding-top: 2px; padding-right: 16px;">
                            <span style="color: #BCBCBE; font-weight: bold; font-size: 18px;">✓</span>
                          </td>
                          <td valign="top" style="font-size: 15px; color: #333333; text-align: left;">
                            Cancel anytime
                          </td>
                        </tr>
                      </table>
                      
                      <a href="${monthlyPaymentLink}" style="display: block; width: 100%; padding: 16px 0; border-radius: 9999px; font-weight: 500; font-size: 15px; background-color: white; border: 1px solid rgba(0,0,0,0.1); color: black; text-decoration: none; text-align: center;">Subscribe Monthly</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 0 24px 24px; text-align: center;">
            <p style="font-size: 14px; color: #767676; margin: 0 0 12px;">Questions? Contact us at <a href="mailto:contact@medlyai.com" style="color: #000000; text-decoration: underline; font-weight: 600;">contact@medlyai.com</a></p>
            <p style="font-size: 14px; color: #767676; margin: 0;">© 2025 Medly AI Ltd. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
