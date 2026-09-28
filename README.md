# KatLearn | English Learning Platform

## Chạy ứng dụng

1. Cài Node.js 22+.
2. Chạy `npm install` và sao chép `.env.example` thành `.env`.
3. Dán Gemini API key vào `GEMINI_API_KEY` trong `.env`.
4. Chạy `npm start`, rồi mở `http://localhost:3000`.

Nếu máy chưa có `npm` nhưng có lệnh `node`, chạy `node dev-server.js` để kiểm tra Firebase Authentication tại `http://localhost:3000`. Server tối giản này không có tính năng AI ngữ cảnh.

## Kết nối Firebase

Trong giao diện, mở nút bánh răng ở góc trên phải và dán Firebase Web app config (JSON) từ Firebase Console. Firebase Web config là cấu hình công khai; bảo mật dữ liệu phải được thực hiện bằng Firebase Authentication và Firestore Security Rules trước khi phát hành.

Trong Firebase Console, bật **Authentication → Sign-in method → Google** và **Apple**. Với Apple, thêm Service ID, Apple Team ID, Key ID và private key theo phần cấu hình của Firebase; đồng thời thêm domain triển khai vào **Authorized domains**. Sao chép nội dung tệp `firestore.rules` vào Firestore Rules rồi Publish.

## Dữ liệu được lưu

- `users/{userId}`: xu, năng lượng, streak, tiến độ và lần học gần nhất.
- `users/{userId}/items/{itemId}`: vật phẩm đã mua.
- `users/{userId}/attempts/*`: từng câu làm, đúng/sai, dạng bài, từ vựng và thời điểm làm — đây là nền tảng cho đề review sau 30 ngày.

Không dán Gemini API key vào Firebase config hoặc JavaScript chạy trên trình duyệt. Khóa phải được giữ ở biến môi trường phía máy chủ. Gemini API hiện có Free Tier cho một số model, nhưng vẫn có giới hạn lưu lượng và chính sách dữ liệu riêng của Google.

## Kích hoạt backend Admin

Tài khoản admin của KatLearn là `katlearn.admin@gmail.com`. Ngoài Firebase Authentication + Firestore Rules, các API quản trị chạy phía server còn cần **Firebase Admin credentials** trong môi trường triển khai.

Trên Vercel project `lms-katlearn`, vào **Settings → Environment Variables** và thêm một trong hai cách:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: toàn bộ JSON service account.
- Hoặc `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`: bản Base64 của toàn bộ JSON service account.
- Phương án thứ ba là ba biến `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

Các biến phải được bật cho **Production** và cần redeploy sau khi thay đổi. Không commit service-account JSON vào GitHub.

## Nếu Firebase không đăng nhập được

1. Trong Firebase Console của project `elp---katlearn`, mở **Authentication → Sign-in method** và bật **Email/Password** (và Google/Apple nếu muốn dùng).
2. Mở **Firestore Database → Create database**, chọn Production mode, sau đó dán nội dung `firestore.rules` vào tab **Rules** và nhấn Publish.
3. Chạy website qua `http://localhost:3000`, không mở trực tiếp tệp `index.html`. Trong dự án này, chạy `node dev-server.js` nếu máy có Node nhưng chưa có npm.
