const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const OPERATIONS = [
    {
        source: '/Users/RohitDhiman/Desktop/Outfest/weapon-detection/valid/images',
        dest: '/Users/RohitDhiman/Desktop/Outfest/val/images'
    },
    {
        source: '/Users/RohitDhiman/Desktop/Outfest/weapon-detection/valid/labels',
        dest: '/Users/RohitDhiman/Desktop/Outfest/val/labels'
    }
];

// 1. Ensure destination directories exist
OPERATIONS.forEach(op => {
    if (!fs.existsSync(op.dest)) {
        fs.mkdirSync(op.dest, { recursive: true });
        console.log(`Created directory: ${op.dest}`);
    }
});

// 2. copy files
function copyFiles() {
    OPERATIONS.forEach(op => {
        if (!fs.existsSync(op.source)) {
            console.error(`Source directory not found: ${op.source}`);
            return;
        }

        const files = fs.readdirSync(op.source);
        let count = 0;

        files.forEach(file => {
            // Skip hidden files like .DS_Store
            if (file.startsWith('.')) return;

            const sourcePath = path.join(op.source, file);
            const destPath = path.join(op.dest, file);

            // Using copyFileSync to copy instead of rename (move)
            try {
                fs.copyFileSync(sourcePath, destPath);
                count++;
            } catch (err) {
                console.error(`Error copying ${file}: ${err.message}`);
            }
        });

        console.log(`Copied ${count} files from ${op.source} to ${op.dest}`);
    });
}

copyFiles();
console.log('✅ Data transfer complete.');