const mineflayer = require('mineflayer');
const fs = require('fs');

// Cấu hình server
const SERVER = {
    host: 'luckyvn.com',
    port: 25565,
    version: '1.20.4'
};

// Cấu hình chung
const DEFAULT_PASSWORD = '21042010';
const RECONNECT_DELAY = 7000;             // ms
const START_DELAY_BETWEEN_ACCOUNTS = 8000; // ms - cách nhau mỗi acc để tránh login dồn dập
const ANTI_AFK_INTERVAL = 4800;            // ms
const MENU_OPEN_TIMEOUT = 15000;           // 15 giây - nếu không mở được menu thì reconnect

// Đọc file acc.txt
let accounts = [];
try {
    const data = fs.readFileSync('acc.txt', 'utf8');
    accounts = data
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
    
    console.log(`Đã đọc được ${accounts.length} tài khoản từ acc.txt`);
    if (accounts.length === 0) {
        console.error('❌ File acc.txt rỗng hoặc không có username hợp lệ!');
        process.exit(1);
    }
} catch (err) {
    console.error('❌ Không đọc được file acc.txt:', err.message);
    process.exit(1);
}

function createBot(username) {
    console.log(`\n━━━━━━━━━━━━━━ [${username}] ━━━━━━━━━━━━━━`);

    const bot = mineflayer.createBot({
        ...SERVER,
        username: username
    });

    let isLoggedIn = false;
    let hasWarped = false;
    let hasOpenedMenu = false;
    let menuTimeout = null;
    let antiAfkTimer = null;

    // Reset state khi reconnect
    function resetState() {
        isLoggedIn = false;
        hasWarped = false;
        hasOpenedMenu = false;
        if (menuTimeout) clearTimeout(menuTimeout);
        menuTimeout = null;
    }

    // Khi spawn
    bot.once('spawn', () => {
        console.log(`[${username}] → Spawn OK`);

        resetState();

        // 1. Login
        setTimeout(() => {
            if (!isLoggedIn) {
                bot.chat(`/login ${DEFAULT_PASSWORD}`);
                console.log(`[${username}] → Gửi /login`);
            }
        }, 3200);

        // 2. Mở menu + timeout kiểm tra kẹt
        setTimeout(() => {
            bot.setQuickBarSlot(4);
            bot.activateItem();
            console.log(`[${username}] → Mở menu (slot 4)`);

            // Nếu 15 giây không thấy windowOpen → reconnect
            menuTimeout = setTimeout(() => {
                if (!hasOpenedMenu) {
                    console.log(`[${username}] → KẸT Ở MỞ MENU quá ${MENU_OPEN_TIMEOUT/1000} giây → reconnect ngay!`);
                    bot.end('Kẹt mở menu quá lâu');
                }
            }, MENU_OPEN_TIMEOUT);

        }, 3800);
    });

    // Khi window mở → hủy timeout + đánh dấu đã mở
    bot.on('windowOpen', (window) => {
        console.log(`[${username}] → Window: \( {window.title} ( \){window.slots.length} slots)`);

        hasOpenedMenu = true;
        if (menuTimeout) {
            clearTimeout(menuTimeout);
            menuTimeout = null;
        }

        if (hasWarped) return;

        setTimeout(() => {
            bot.clickWindow(20, 0, 0);
            console.log(`[${username}] → Click slot 20`);

            setTimeout(() => {
                bot.clickWindow(22, 0, 0);
                console.log(`[${username}] → Click slot 22`);
            }, 400);

        }, 800);
    });

    // Khi window đóng → warp afk
    bot.on('windowClose', () => {
        console.log(`[${username}] → Window đóng`);

        setTimeout(() => {
            if (!hasWarped && isLoggedIn) {
                bot.chat('/warp afk');
                console.log(`[${username}] → Warp → afk`);
                hasWarped = true;
            }
        }, 1400);
    });

    // Phát hiện login thành công qua chat
    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString().toLowerCase();
        if (msg.includes('đăng nhập thành công') ||
            msg.includes('chào mừng') ||
            msg.includes('welcome') ||
            msg.includes('đã đăng nhập')) {
            if (!isLoggedIn) {
                console.log(`[${username}] → LOGIN THÀNH CÔNG!`);
                isLoggedIn = true;
            }
        }
    });

    // Anti-AFK (jump random thời gian)
    antiAfkTimer = setInterval(() => {
        if (bot.entity?.position) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 120 + Math.random() * 180);
        }
    }, ANTI_AFK_INTERVAL + Math.random() * 2000); // \~4.8-6.8s

    // Xử lý ngắt kết nối
    bot.on('end', (reason) => {
        console.log(`[\( {username}] → Ngắt kết nối ( \){reason || 'không rõ'}) → reconnect sau ${RECONNECT_DELAY/1000}s...`);
        clearInterval(antiAfkTimer);
        if (menuTimeout) clearTimeout(menuTimeout);
        resetState();
        setTimeout(() => createBot(username), RECONNECT_DELAY);
    });

    bot.on('error', (err) => {
        console.log(`[${username}] → Lỗi: ${err.message || err}`);
    });

    bot.on('kicked', (reason) => {
        console.log(`[${username}] → Bị kick: ${reason}`);
    });
}

// Khởi động tất cả bot, delay giữa các acc
function startBots() {
    console.log(`\nBắt đầu chạy ${accounts.length} tài khoản...\n`);

    accounts.forEach((username, index) => {
        setTimeout(() => {
            createBot(username);
        }, index * START_DELAY_BETWEEN_ACCOUNTS);
    });
}

// Chạy lần đầu
startBots();

// Optional: restart toàn bộ sau 3 tiếng (phòng server bảo trì / reset)
setInterval(() => {
    console.log('\n→→→ RESTART TOÀN BỘ BOT SAU 3 TIẾNG →→→\n');
    startBots();
}, 1000 * 60 * 60 * 3);

// Giữ process sống
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
