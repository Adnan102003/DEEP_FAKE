let resultHistory = [];

document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    handleFile(file);
});

const dropArea = document.getElementById('dropArea');
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('dragover'); });
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file!');
        return;
    }
    if (file.size > 3 * 1024 * 1024) { // 3MB limit
        alert('Image file too large! (max 3MB)');
        return;
    }
    showImagePreview(file);
    analyzeImage(file);
}

function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('preview').innerHTML = `
            <h3>📸 Uploaded Image:</h3>
            <img src="${e.target.result}" alt="Uploaded image">
        `;
    };
    reader.readAsDataURL(file);
}

function analyzeImage(file) {
    document.getElementById('loader').style.display = 'block';
    const results = document.getElementById('results');
    results.innerHTML = '';
    const formData = new FormData();
    formData.append('image', file);

    fetch('http://127.0.0.1:5000/analyze', { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loader').style.display = 'none';
        if (data.status === 'success') {
            const color = data.result === 'AI-Generated'
                ? 'style="color:#E13D30;font-weight:bold;"'
                : 'style="color:#1E9324;font-weight:bold;"';
            const timestamp = new Date().toLocaleString();
            const confWidth = Math.round(data.confidence * 100);
            const confBarClass = data.result === "AI-Generated" ? 'conf-bar-inner conf-bar-fake' : 'conf-bar-inner conf-bar-real';
            const confBarHTML = `
                <div class="conf-bar-wrap">
                    <div class="${confBarClass}" style="width:${confWidth}%;"></div>
                </div>
            `;
            const previewImg = document.querySelector('#preview img')?.src || '';
            const historyId = `hist_${Date.now()}`;
            const html = `
            <div id="${historyId}" class="history-item">
                <div class="history-header history-toggle" onclick="this.parentNode.classList.toggle('history-collapse')">▼ Show/Hide Result</div>
                <div class="history-body">
                    <img src="${previewImg}" alt="submitted" style="max-width:140px;float:right;margin-left:9px;">
                    <h2 ${color}>${data.result}</h2>
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Time:</strong> ${timestamp}</p>
                    <p><strong>Confidence:</strong> ${(data.confidence*100).toFixed(2)}%</p>
                    ${confBarHTML}
                    <p><strong>Explanation:</strong> ${data.explanation}</p>
                    <div>
                        <h4>
                            AI Heatmap:
                            <span title="Heatmaps highlight the regions AI found most suspicious or important." style="cursor:pointer;">
                                ℹ️
                            </span>
                        </h4>
                        <img src="${data.heatmap}" style="max-width:300px;">
                    </div>
                    <button onclick="downloadResult(${JSON.stringify(data).replace(/"/g,'&quot;')})" class="download-btn">⬇️ Download Result</button>
                </div>
            </div>
            `;
            resultHistory.unshift(html);
            if(resultHistory.length > 3) resultHistory.pop();
            results.innerHTML = resultHistory.join('<hr>');
        } else {
            results.innerHTML = `<div class="error">${data.message}</div>`;
        }
    })
    .catch(() => {
        document.getElementById('loader').style.display = 'none';
        results.innerHTML = '<div class="error">❌ Could not connect to backend. Is it running?</div>';
    });
}

function downloadResult(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 250;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#f9f9fc";
    ctx.fillRect(0,0,400,250);
    ctx.fillStyle = data.result === "AI-Generated" ? "#E13D30" : "#1E9324";
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Result: ${data.result}`, 20, 40);
    ctx.fillStyle = '#333'; ctx.font = '18px Arial';
    ctx.fillText(`Confidence: ${(data.confidence*100).toFixed(2)}%`, 20, 80);
    ctx.fillText(`Explanation:`, 20, 120);
    ctx.fillText(data.explanation.slice(0, 38), 20, 150);
    if(data.explanation.length > 38) ctx.fillText(data.explanation.slice(38, 75), 20, 180);
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = "DeepDetect_Result.png";
    link.click();
}

document.getElementById('clearBtn').onclick = function() {
    resultHistory = [];
    document.getElementById('results').innerHTML = "";
};

document.getElementById('demoBtn').onclick = function() {
    fetch('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600')
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], "demo.jpg", {type:"image/jpeg"});
            showImagePreview(file);
            analyzeImage(file);
        });
};

document.getElementById('toggleMode').onclick = function() {
    document.body.classList.toggle('dark');
};
l