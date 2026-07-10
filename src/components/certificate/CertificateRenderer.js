/**
 * Single source of truth for the certificate design (gold, brand-logo).
 * Returns the certificate as an HTML string (1120×790) — used BOTH by the
 * on-screen viewer (via dangerouslySetInnerHTML) and the quick-download-PDF
 * feature, so the two can never drift apart.
 */
import { APTECH_LOGO_DATA_URI } from './certificateAssets';

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatDateShort = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function renderCertificateHTML(cert = {}) {
    const GOLD = '#F3A522', GOLD_DK = '#c9871a', INK = '#14100c', MUTE = '#8a8f98';
    const verifyBase = (typeof window !== 'undefined' && window.location?.origin) || 'https://aptechlearning.com';
    const verifyUrl = `${verifyBase}/verify-certificate?id=${cert.id || ''}`;

    return `
    <div style="width:1120px;height:790px;background:#fffdf8;position:relative;font-family:'Poppins','Segoe UI',sans-serif;overflow:hidden;box-sizing:border-box;">
        <!-- soft gold corner glows (kept subtle; no center watermark — it read as a smudge) -->
        <div style="position:absolute;top:-160px;right:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(243,165,34,0.10),transparent 70%);"></div>
        <div style="position:absolute;bottom:-160px;left:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(154,160,168,0.09),transparent 70%);"></div>

        <!-- decorative frame -->
        <div style="position:absolute;top:16px;left:16px;right:16px;bottom:16px;border:6px solid ${GOLD};border-radius:14px;"></div>
        <div style="position:absolute;top:26px;left:26px;right:26px;bottom:26px;border:1.5px solid ${GOLD_DK};border-radius:8px;"></div>
        <!-- corner flourishes -->
        <div style="position:absolute;top:34px;left:34px;width:54px;height:54px;border-top:4px solid ${GOLD_DK};border-left:4px solid ${GOLD_DK};border-radius:6px 0 0 0;"></div>
        <div style="position:absolute;top:34px;right:34px;width:54px;height:54px;border-top:4px solid ${GOLD_DK};border-right:4px solid ${GOLD_DK};border-radius:0 6px 0 0;"></div>
        <div style="position:absolute;bottom:34px;left:34px;width:54px;height:54px;border-bottom:4px solid ${GOLD_DK};border-left:4px solid ${GOLD_DK};border-radius:0 0 0 6px;"></div>
        <div style="position:absolute;bottom:34px;right:34px;width:54px;height:54px;border-bottom:4px solid ${GOLD_DK};border-right:4px solid ${GOLD_DK};border-radius:0 0 6px 0;"></div>

        <!-- content -->
        <div style="position:relative;height:100%;padding:58px 92px 46px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;box-sizing:border-box;">
            <!-- header -->
            <div style="width:100%;">
                <img src="${APTECH_LOGO_DATA_URI}" alt="Aptech Learning" style="height:58px;margin:0 auto 6px;display:block;"/>
                <div style="font-size:10px;font-weight:600;color:${MUTE};letter-spacing:4px;text-transform:uppercase;">Professional Training Institute</div>
                <div style="width:120px;height:3px;margin:16px auto 0;background:linear-gradient(90deg,transparent,${GOLD},transparent);"></div>
            </div>

            <!-- body -->
            <div style="width:100%;">
                <div style="font-size:13px;font-weight:700;color:${GOLD_DK};letter-spacing:6px;text-transform:uppercase;">Certificate of Completion</div>
                <div style="font-size:13px;color:${MUTE};margin-top:14px;">This certificate is proudly presented to</div>

                <div style="font-size:52px;font-weight:800;color:${INK};letter-spacing:-0.5px;line-height:1.05;margin:12px 0 6px;">${cert.studentName || 'Student Name'}</div>
                <div style="width:340px;height:2px;margin:0 auto;background:linear-gradient(90deg,transparent,${GOLD},transparent);"></div>

                <div style="font-size:13px;color:${MUTE};margin-top:22px;">for successfully completing the course</div>
                <div style="font-size:28px;font-weight:800;color:${GOLD_DK};margin-top:6px;line-height:1.25;">${cert.courseName || 'Course Name'}</div>

                <div style="font-size:12px;color:${MUTE};margin-top:14px;">
                    Batch <span style="font-weight:700;color:${INK};">${cert.batchNumber || cert.batchId || '—'}</span>
                    <span style="margin:0 10px;color:#e6ddca;">•</span>
                    ${formatDateShort(cert.startDate)} &ndash; ${formatDateShort(cert.endDate)}
                </div>
            </div>

            <!-- footer -->
            <div style="width:100%;">
                <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 24px;">
                    <!-- issue date -->
                    <div style="text-align:center;min-width:210px;">
                        <div style="font-size:15px;font-weight:700;color:${INK};font-family:'Segoe UI',sans-serif;">${formatDate(cert.issueDate)}</div>
                        <div style="border-top:1.5px solid #d9cbb0;margin-top:6px;padding-top:6px;font-size:9px;font-weight:600;color:${MUTE};letter-spacing:1.5px;text-transform:uppercase;">Date of Issue</div>
                    </div>

                    <!-- seal -->
                    <div style="text-align:center;margin-bottom:2px;">
                        <div style="width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,#fff,#FEF6E7);border:3px solid ${GOLD};box-shadow:0 6px 18px rgba(243,165,34,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto;">
                            <div style="width:78px;height:78px;border-radius:50%;border:1.5px dashed ${GOLD_DK};display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <img src="${APTECH_LOGO_DATA_URI}" alt="" style="width:44px;"/>
                                <div style="font-size:6.5px;font-weight:800;color:${GOLD_DK};letter-spacing:1.5px;margin-top:2px;">VERIFIED</div>
                            </div>
                        </div>
                    </div>

                    <!-- signatory -->
                    <div style="text-align:center;min-width:210px;">
                        <div style="font-size:20px;color:${GOLD_DK};font-family:'Segoe UI',cursive;font-style:italic;font-weight:600;">Aptech Learning</div>
                        <div style="border-top:1.5px solid #d9cbb0;margin-top:6px;padding-top:6px;font-size:9px;font-weight:600;color:${MUTE};letter-spacing:1.5px;text-transform:uppercase;">Authorized Signatory</div>
                    </div>
                </div>

                <div style="margin-top:20px;display:flex;justify-content:center;align-items:center;gap:14px;font-size:10px;color:${MUTE};">
                    <span>Certificate ID: <b style="font-family:monospace;color:${INK};letter-spacing:0.5px;">${cert.id || '—'}</b></span>
                    <span style="color:#e6ddca;">|</span>
                    <span>Verify at <b style="color:${GOLD_DK};">${verifyUrl.replace(/^https?:\/\//, '')}</b></span>
                </div>
            </div>
        </div>
    </div>`;
}
