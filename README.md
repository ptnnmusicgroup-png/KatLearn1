# KatLearn | English Learning Platform

## Chạy ứng dụng

1. Cài Node.js 18+.
2. Chạy `npm install` và sao chép `.env.example` thành `.env`.
3. Dán OpenAI API key vào `OPENAI_API_KEY` trong `.env`.
4. Chạy `npm start`, rồi mở `http://localhost:3000`.

Nếu máy chưa có `npm` nhưng có lệnh `node`, chạy `node dev-server.js` để kiểm tra Firebase Authentication tại `http://localhost:3000`. Server tối giản này không có tính năng AI ngữ cảnh.

## Kết nối Firebase

Trong giao diện, mở nút bánh răng ở góc trên phải và dán Firebase Web app config (JSON) từ Firebase Console. Firebase Web config là cấu hình công khai; bảo mật dữ liệu phải được thực hiện bằng Firebase Authentication và Firestore Security Rules trước khi phát hành.

Trong Firebase Console, bật **Authentication → Sign-in method → Google** và **Apple**. Với Apple, thêm Service ID, Apple Team ID, Key ID và private key theo phần cấu hình của Firebase; đồng thời thêm domain triển khai vào **Authorized domains**. Sao chép nội dung tệp `firestore.rules` vào Firestore Rules rồi Publish.

## Dữ liệu được lưu

- `users/{userId}`: xu, năng lượng, streak, tiến độ và lần học gần nhất.
- `users/{userId}/items/{itemId}`: vật phẩm đã mua.
- `users/{userId}/attempts/*`: từng câu làm, đúng/sai, dạng bài, từ vựng và thời điểm làm — đây là nền tảng cho đề review sau 30 ngày.

Không dán OpenAI API key vào Firebase config hoặc JavaScript chạy trên trình duyệt. Theo [hướng dẫn OpenAI](https://platform.openai.com/docs/quickstart/make-your-first-api-request), khóa phải được giữ ở biến môi trường phía máy chủ.

## Kích hoạt tài khoản Admin

Tài khoản admin của KatLearn là `katlearn.admin@gmail.com`. Bật **Email/Password** trong Firebase Authentication, rồi tại website chọn **Tạo tài khoản Email mới** và dùng đúng email này. Sau đó Publish `firestore.rules`; Rules sẽ tự cấp quyền xuất bản pack cho đúng email đó. Không cần service-account JSON hoặc chạy script cấp claim.

## Nếu Firebase không đăng nhập được

1. Trong Firebase Console của project `elp---katlearn`, mở **Authentication → Sign-in method** và bật **Email/Password** (và Google/Apple nếu muốn dùng).
2. Mở **Firestore Database → Create database**, chọn Production mode, sau đó dán nội dung `firestore.rules` vào tab **Rules** và nhấn Publish.
3. Chạy website qua `http://localhost:3000`, không mở trực tiếp tệp `index.html`. Trong dự án này, chạy `node dev-server.js` nếu máy có Node nhưng chưa có npm.
