// Helper to format seconds into MM:SS or HH:MM:SS
function formatTime(seconds) {
    if (!seconds) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Function to fetch and display the history
function loadHistory() {
    chrome.storage.local.get(['watchHistory'], function(result) {
        const listDiv = document.getElementById('history-list');
        const history = result.watchHistory || [];

        if (history.length === 0) {
            listDiv.innerHTML = "<p>No videos tracked yet.</p>";
            return;
        }

        listDiv.innerHTML = ""; 
        
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'video-item';
            div.innerHTML = `
                <div class="title">${item.title}</div>
                <div class="timestamp">Stopped at: ${formatTime(item.time)} / ${formatTime(item.duration)}</div>
                <div class="date">Last watched: ${item.lastWatched}</div>
            `;
            listDiv.appendChild(div);
        });
    });
}

// 1. Load the history immediately when you click the extension icon
loadHistory();

// 2. THE BRAIN FOR THE BUTTON: Tell the clear button what to do
document.getElementById('clear-btn').addEventListener('click', () => {
    // Overwrite the storage with an empty array
    chrome.storage.local.set({ watchHistory: [] }, () => {
        // Refresh the popup list to show it's empty
        loadHistory();
    });
});