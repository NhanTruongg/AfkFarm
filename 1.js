const mineflayer = require('mineflayer');

function createBot() {
    console.log('🔄 Đang khởi động bot...');

    const bot = mineflayer.createBot({
        host: 'luckyvn.com',
        port: 25565,
        username: 'nhanvn3',
        version: '1.20.4'
    });

    // Mở web inventory viewer (truy cập http://localhost:8000 để xem)
    

    let isLoggedIn = false;
    let hasWarped = false;

    // ─── Khi bot spawn ───────────────────────────────────────
    bot.once('spawn', () => {
        console.log('✅ Bot đã spawn');

        hasWarped = false;  // Reset mỗi lần spawn mới
        isLoggedIn = false;

        // 1. Login
        setTimeout(() => {
            if (!isLoggedIn) {
                bot.chat('/login 21042010');
                console.log('🔑 Đã gửi lệnh đăng nhập: /dn 21042010');
            }
        }, 3200);

        // 2. Mở menu (hotbar slot 4)
        setTimeout(() => {
            bot.setQuickBarSlot(4);
            bot.activateItem();
            console.log('📦 Đã mở menu (click slot 4 hotbar)');
        }, 3500);
    });

    // ─── Khi menu (window) mở ───────────────────────────────
    bot.on('windowOpen', (window) => {
        console.log(`📦 Window mở: "${window.title}" (id: ${window.id}, total slots: ${window.slots.length})`);

        if (hasWarped) return;

        setTimeout(() => {
            const slot = 20;
            const slot2 = 22;
            // Click trái bình thường
            bot.clickWindow(slot, 0, 0);
            console.log(`✅ Đã click slot ${slot}`);
            bot.clickWindow(slot2, 0, 0);
            // KHÔNG đóng thủ công → chờ server đóng (thường sau khi chọn warp)

        }, 700);
    });

    // ─── Khi window đóng (thường sau khi click warp thành công) ───────
    bot.on('windowClose', (window) => {
        console.log(`🗑️ Window đã đóng: "${window.title || 'không tên'}"`);

        setTimeout(() => {
            if (!hasWarped && isLoggedIn) {
                bot.chat('/warp afk');
                console.log('🚀 Đã gửi lệnh: /warp afk1');
                hasWarped = true;
            }
        }, 1000);  // Đợi thêm 1 giây để chắc chắn vị trí đã thay đổi
    });

    // ─── Auto jump chống AFK ─────────────────────────────
    setInterval(() => {
        if (bot.entity?.position) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 180);
        }
    }, 5000);

    // ─── Xử lý đăng nhập thành công (dựa vào chat) ───────
    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString().toLowerCase();
        if (msg.includes('đăng nhập thành công') ||
            msg.includes('chào mừng') ||
            msg.includes('welcome') ||
            msg.includes('đã đăng nhập')) {
            if (!isLoggedIn) {
                console.log('🎉 Đăng nhập thành công!');
                isLoggedIn = true;
            }
        }
    });

    // ─── Xử lý disconnect / error / kick ─────────────────
    bot.on('end', (reason) => {
        console.log(`❌ Bot ngắt kết nối (lý do: ${reason || 'không rõ'}) → reconnect sau 5 giây...`);
        isLoggedIn = false;
        hasWarped = false;
        setTimeout(createBot, 5000);
    });

    bot.on('error', (err) => {
        console.log('⚠️ Lỗi bot:', err.message || err);
    });

    bot.on('kicked', (reason, loggedIn) => {
        console.log(`👢 Bị kick: ${reason}`);
    });
}

// ─── Khởi động bot lần đầu ──────────────────────────────────
createBot();