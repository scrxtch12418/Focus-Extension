chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRIGGER_CLEANSE') {
        if (message.state) {
            activateZenReader();
        } else {

            window.location.reload();
        }
    }
});

function activateZenReader() {

    const junkSelectors = [
        'aside', 'footer', 'nav', 'header', '.ad', '.ads', '.advertisement',
        '[class*="banner"]', '[id*="ad-"]', 'iframe', '.social-share', '#comments'
    ];

    junkSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    });


    document.querySelectorAll('script').forEach(s => s.remove());

    // 3. Find the main article content
    const mainContent = document.querySelector('article, main, [role="main"]') || document.body;


    document.body.innerHTML = '';
    document.body.appendChild(mainContent);


    const style = document.createElement('style');
    style.textContent = `
        body {
            background-color: #1e1e2e !important; /* Catppuccin Base */
            color: #cdd6f4 !important; /* Catppuccin Text */
            font-family: 'Georgia', serif !important;
            line-height: 1.8 !important;
            font-size: 18px !important;
            margin: 0 !important;
            padding: 5% 15% !important;
            transition: all 0.5s ease;
        }
        a { color: #89b4fa !important; text-decoration: none !important; }
        img { max-width: 100% !important; border-radius: 12px; margin: 20px 0; }
        h1, h2, h3 { color: #cba6f7 !important; font-family: 'Adwaita Mono', monospace !important; }
    `;
    document.head.appendChild(style);
}