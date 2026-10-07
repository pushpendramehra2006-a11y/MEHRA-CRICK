# Mehra Cricket

Node.js (Express) backend + plain HTML/CSS/JS frontend.

## Local chalane ke liye
    npm install
    npm start
Fir http://localhost:3000 kholo.

## Folder
    server.js        backend (login, signup, data save)
    package.json
    public/index.html
    public/style.css
    public/app.js    frontend

## Environment variables
    JWT_SECRET   zaroor set karo (koi lamba random text)
    DATA_FILE    (optional) data.json ka path
    PORT         (hosting khud set karti hai)

## Deploy (Render.com example)
1. Folder GitHub par push karo.
2. Render -> New -> Web Service -> repo chuno.
3. Build command: npm install   |   Start command: npm start
4. Environment me JWT_SECRET daalo.
5. Data permanent rakhne ke liye Render "Disk" add karo (mount path /data)
   aur DATA_FILE=/data/data.json set karo. Bina disk ke free plan par
   restart hone par data ud sakta hai.

## Note
Data JSON file me save hota hai (chhote use ke liye theek). Zyada users ho
to MongoDB / PostgreSQL / Supabase par shift karo.
