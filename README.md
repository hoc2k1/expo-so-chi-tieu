# 📱 Sổ Chi Tiêu - Quản Lý Tài Chính Cá Nhân Tự Động (Android)

Ứng dụng quản lý thu chi thông minh trên Android bằng cách **lắng nghe thông báo biến động số dư** từ các ứng dụng ngân hàng và ví điện tử, tự động bóc tách số tiền, gợi ý phân loại thông minh theo từ khóa, sở hữu **cơ chế chống trùng thông báo 2 lớp**, lưu trữ dữ liệu hoàn toàn cục bộ dưới dạng **file JSON (không cần Database server)** và hỗ trợ **cập nhật OTA qua EAS Update không cần build lại file APK**.

---

## 🌟 Tính Năng Nổi Bật

1. **Lắng nghe thông báo ngân hàng & ví điện tử tự động**:
   - Tích hợp Native Android `NotificationListenerService`.
   - Hỗ trợ sẵn các ngân hàng & ví phổ biến tại Việt Nam: **Vietcombank, MB Bank, Techcombank, BIDV, VietinBank, ACB, TPBank, VPBank, Sacombank, Agribank, MSB, MoMo, ZaloPay, VNPay, ShopeePay, Gmail (nhận mail biến động số dư), Tin nhắn SMS**.
   - Cho phép bật/tắt hoặc thêm package app bất kỳ trên thiết bị.
2. **Cơ chế Chống trùng Thông báo 2 Lớp (Deduplication Engine)**:
   - **Lớp 1 - Chặn ngầm 100% (Hard Duplicate)**: Tự động bỏ qua không tạo bản ghi mới nếu thông báo đến trong vòng 5 phút có nội dung trùng lặp hoàn toàn, hoặc trùng đồng thời (Số tiền + Loại Thu/Chi + Mã GD hoặc Số dư sau GD).
   - **Lớp 2 - Cảnh báo Nghi trùng (Soft Duplicate)**: Nếu trong 3 phút xuất hiện 2 giao dịch cùng số tiền (ví dụ vừa nhận thông báo từ App Ngân hàng vừa nhận email từ Gmail), app vẫn đưa vào Hàng chờ nhưng gắn nhãn cảnh báo vàng/đỏ `"⚠️ Nghi trùng"` kèm nút `"Bỏ qua / Xóa trùng"` 1 chạm.
3. **Phân loại Thông minh & Hàng loạt (Batch Mode)**:
   - Tự động gợi ý Phân loại & Ghi chú dựa trên từ khóa trong nội dung (VD: `GRAB`, `SHOPEE`, `HIGHLANDS`, `TIEN DIEN`, `LUONG`...).
   - Cho phép phân loại 1 giao dịch hoặc chọn nhiều giao dịch trong Hàng chờ để phân loại/xóa cùng lúc.
   - Tự do nhập tay Phân loại / Ghi chú mới kèm tùy chọn *"Lưu vào danh sách mẫu"*.
4. **Màn hình Thống kê Trực quan & Drill-down**:
   - Thẻ tổng kết: Tổng Thu, Tổng Chi, Số dư chênh lệch ròng.
   - Biểu đồ phân bổ tỷ trọng phần trăm theo từng Phân loại.
   - **Liên kết Drill-down**: Nhấn vào bất kỳ Phân loại nào trên màn Thống kê sẽ tự động chuyển sang màn Sổ giao dịch với bộ lọc danh mục đó được áp dụng sẵn.
5. **Lưu trữ Cục bộ (Local JSON Storage - No DB)**:
   - Mọi dữ liệu lưu trữ trực tiếp trên máy dạng file `.json` (`expo-file-system`).
   - Sao lưu toàn bộ dữ liệu ra 1 file JSON duy nhất để lưu trữ hoặc gửi qua Google Drive/Zalo.
   - Khôi phục dữ liệu nguyên vẹn từ file JSON khi đổi máy hoặc cài lại app.
   - Xuất danh sách giao dịch ra file **Excel (CSV)** mã hóa **UTF-8 BOM** hiển thị chuẩn tiếng Việt không bị lỗi font.
6. **Bộ Giả lập Thông báo Ngân hàng (Test Simulator)**:
   - Bắn thử thông báo mẫu của VCB, MB, MoMo,...
   - Thử nghiệm ngay kịch bản bắn trùng (Lớp 1 & Lớp 2) mà không cần chuyển khoản thật.

---

## 🛠️ Yêu Cầu & Cài Đặt Môi Trường

### 1. Công cụ cần thiết
- **Node.js**: Phiên bản LTS (Khuyến nghị Node >= 20.x hoặc 22.x).
- **Git**: Đã cài đặt trên máy.
- **Java Development Kit (JDK)**: JDK 17 (Cần thiết nếu muốn build/chạy Android local).
- **Android Studio / Android SDK**: Có cài `Android SDK Platform 34+` và `Android SDK Build-Tools`.
- **EAS CLI**: Công cụ build đám mây và cập nhật OTA của Expo.

Cài đặt EAS CLI toàn cục:
```bash
npm install -g eas-cli
```

---

## 🚀 Hướng Dẫn Khởi Tạo Dự Án Expo & Cấu Hình EAS (Lần Đầu Tiên)

Nếu bạn muốn nắm các bước đã thực hiện để tạo và liên kết dự án với tài khoản EAS `--account hockt`:

### Bước 1: Khởi tạo dự án
```bash
npx create-expo-app@latest so-chi-tieu --template default
cd so-chi-tieu
```

### Bước 2: Đăng nhập tài khoản Expo & Liên kết EAS
```bash
# 1. Đăng nhập tài khoản Expo
eas login

# 2. Khởi tạo và liên kết dự án với account hockt
eas init --account hockt

# 3. Khởi tạo cấu hình EAS Build cho Android
eas build:configure -p android
```

### Bước 3: Cấu hình `eas.json` xuất file APK trực tiếp
Mở file `eas.json`, cấu hình profile `preview` để build ra file `.apk` cài đặt trực tiếp lên điện thoại và gán kênh `channel: "preview"` cho cập nhật OTA:

```json
{
  "cli": {
    "version": ">= 24.10.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "preview"
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 📦 Các Bước Build File APK Lần Đầu Tiên

Do tính năng đọc thông báo ngân hàng sử dụng Native Service (`NotificationListenerService`), bạn cần tạo và cài đặt file APK **lần đầu tiên**:

```bash
# Build file APK trên đám mây EAS (không cần máy cấu hình mạnh, không cần Android Studio)
eas build -p android --profile preview
```

Sau khi build xong (khoảng 5-10 phút), EAS sẽ cung cấp:
1. Đường dẫn tải trực tiếp file `.apk`.
2. Mã QR để quét bằng camera điện thoại Android để tải và cài đặt ngay.

---

## ⚡ Các Bước Cập Nhật Ứng Dụng KHÔNG CẦN Build Lại APK (EAS Update)

Từ lần build APK đầu tiên trở đi, mọi thay đổi về:
- Giao diện màn hình (UI/UX)
- Logic bóc tách thông báo (Regex)
- Thêm quy tắc từ khóa gợi ý
- Tính năng mới trên JavaScript / TypeScript

👉 **BẠN KHÔNG CẦN PHẢI BUILD LẠI FILE APK!** 

Chỉ cần chạy lệnh **`eas update`**, toàn bộ người dùng đang mở app sẽ nhận ngay bản cập nhật mới qua mạng (OTA Update).

### Quy trình chuẩn: Kết hợp Git Commit & EAS Update

Mỗi khi bạn hoàn thành một tính năng hoặc sửa lỗi, thực hiện đúng 4 bước sau:

```bash
# Bước 1: Kiểm tra lỗi cú pháp và typecheck
npx tsc --noEmit
npm run lint

# Bước 2: Thêm thay đổi vào Git và Commit
git add .
git commit -m "feat: cập nhật logic bóc tách thông báo và giao diện thống kê"

# Bước 3: Đẩy code lên GitHub
git push origin main

# Bước 4: Phát hành bản cập nhật OTA tức thì qua EAS Update
eas update --branch preview --message "Cập nhật bóc tách thông báo và biểu đồ"
```

Khi người dùng mở ứng dụng trên điện thoại, `expo-updates` sẽ tự động tải phiên bản JS mới nhất trong nền và áp dụng ngay!

---

## 🏃 Chạy Ứng Dụng Trong Môi Trường Phát Triển (Local Dev)

```bash
# Khởi động Expo Metro Bundler
npx expo start

# Hoặc mở trực tiếp trên thiết bị Android qua ADB (Development Build)
npx expo run:android

# Kiểm tra tình trạng dự án
npx expo-doctor
```

---

## 📂 Cấu Trúc Thư Mục Source Code

```
so-chi-tieu/
├── assets/
│   └── images/              # Bộ nhận diện: icon.png, splash-icon.png, adaptive-icon...
├── modules/
│   └── notification-listener/ # Native Module Android NotificationListenerService
│       ├── android/          # Service Native Kotlin & AndroidManifest
│       └── src/              # TypeScript Bridge & Event Emitter
├── src/
│   ├── app/                 # Expo Router Screens & Modals
│   │   ├── (tabs)/          # 4 Tabs: Hàng chờ, Sổ giao dịch, Thống kê, Cài đặt
│   │   ├── modal/           # Phân loại, Tiền mặt, Giả lập test, Quản lý danh mục/rules
│   │   └── _layout.tsx      # Root Stack Navigator & Providers
│   ├── constants/           # Danh sách App ngân hàng/ví mặc định, Categories, Rules
│   ├── contexts/            # AppContext (Quản lý State đồng bộ với JSON storage)
│   ├── models/              # TypeScript interfaces (Transaction, Category, Rule...)
│   ├── services/            # Storage (JSON), Parser (Regex), Deduplication (2-layer), CSV Exporter
│   └── utils/               # Định dạng tiền VND, ngày giờ
├── app.json                 # Cấu hình Expo, EAS Project ID, Native Permissions
├── eas.json                 # Cấu hình EAS Build (APK preview) & EAS Update channels
├── package.json
└── README.md
```

---

## 🔒 Quản Lý Git Repository

Dự án đã được khởi tạo Git và liên kết với kho lưu trữ riêng tư:
- **Private Repo URL**: `https://github.com/hoc2k1/expo/so-chi-tieu`
- **Initial Commit**: `init app`

---

## 💡 Mẹo Sử Dụng Thực Tế

1. **Sau khi cài file APK vào điện thoại Android**:
   - Mở ứng dụng, app sẽ hiển thị banner nhắc cấp quyền đọc thông báo.
   - Bấm nút **"Cấp quyền"** -> Chọn **"Sổ Chi Tiêu"** trong danh sách và gạt công tắc cho phép.
   - Vào mục **Cài đặt** -> **Danh sách App Ngân hàng & Ví** để kiểm tra các app bạn đang dùng đã được bật chưa.
2. **Thử nghiệm không cần chuyển khoản thật**:
   - Tại tab **Hàng chờ**, bấm nút **"Bắn thử thông báo"** để thử nghiệm bóc tách số tiền và tính năng chống trùng 2 lớp ngay lập tức!
