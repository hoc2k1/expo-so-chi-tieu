# 📱 Sổ Chi Tiêu - Quản Lý Tài Chính Cá Nhân Tự Động (Android)

Ứng dụng quản lý thu chi thông minh trên Android bằng cách **lắng nghe thông báo biến động số dư** từ các ứng dụng ngân hàng và ví điện tử, tự động bóc tách số tiền, gợi ý phân loại thông minh theo từ khóa, sở hữu **cơ chế chống trùng thông báo 2 lớp**, lưu trữ dữ liệu hoàn toàn cục bộ dưới dạng **file JSON (không cần Database server)** và hỗ trợ **cập nhật OTA qua EAS Update không cần build lại file APK**.

---

## 🌟 Tính Năng Nổi Bật

1. **Lắng nghe thông báo ngân hàng & ví điện tử tự động (Kể cả khi chạy ngầm hoặc tắt app)**:
   - Tích hợp Native Android `NotificationListenerService` với cơ chế tự động kết nối lại (`requestRebind` + `stopWithTask="false"`) và quét lại thanh trạng thái hệ thống khi mở lại ứng dụng.
   - Hỗ trợ sẵn các ngân hàng & ví phổ biến tại Việt Nam: **Vietcombank, MB Bank, Techcombank, BIDV, VietinBank, ACB, TPBank, VPBank, Sacombank, Agribank, MSB, Timo, MoMo, ZaloPay, Viettel Money, VNPay, ShopeePay, Gmail (nhận mail biến động số dư), Tin nhắn SMS**.
   - Cho phép bật/tắt hoặc thêm package app bất kỳ trên thiết bị.
2. **Cơ chế Chống trùng Thông báo 2 Lớp (Deduplication Engine)**:
   - **Lớp 1 - Chặn ngầm 100% (Hard Duplicate)**: Tự động bỏ qua không tạo bản ghi mới nếu thông báo đến trong vòng 5 phút có nội dung trùng lặp hoàn toàn, hoặc trùng đồng thời (Số tiền + Loại Thu/Chi + Mã GD hoặc Số dư sau GD).
   - **Lớp 2 - Cảnh báo Nghi trùng (Soft Duplicate)**: Nếu trong 3 phút xuất hiện 2 giao dịch trùng cả **Ngân hàng/Ví nguồn + Số tiền + Loại Thu/Chi**, app vẫn đưa vào Hàng chờ nhưng gắn nhãn cảnh báo vàng/đỏ `"⚠️ Nghi trùng"` kèm nút `"Bỏ qua / Xóa trùng"` 1 chạm.
3. **Phân loại Thông minh & Hàng loạt (Nhấn giữ để chọn nhiều)**:
   - Tự động nhận diện Thu nhập (`+`) / Chi tiêu (`-`) từ thông báo và gợi ý Phân loại & Ghi chú dựa trên từ khóa trong nội dung (VD: `GRAB`, `SHOPEE`, `HIGHLANDS`, `TIEN DIEN`, `LUONG`...).
   - Nhấn giữ (`Long Press`) vào bất kỳ khoản nào trong Hàng chờ để bật chế độ chọn nhiều và phân loại/xóa hàng loạt.
   - Tự do nhập tay Phân loại / Ghi chú mới kèm tùy chọn _"Lưu vào danh sách mẫu"_.
4. **Màn hình Thống kê Biểu đồ Tròn (`%`) & Drill-down Đồng bộ Bộ lọc**:
   - Thẻ tổng kết: Tổng Thu, Tổng Chi, Số dư chênh lệch ròng.
   - Bộ lọc nâng cao theo **Khoảng thời gian tùy chỉnh (Từ ngày giờ - Đến ngày giờ)** và **Ngân hàng / Ví điện tử**.
   - **Biểu đồ Hình tròn (Donut / Pie Chart)** hiển thị trực quan tỷ trọng phần trăm (`%`) của từng Phân loại.
   - **Liên kết Drill-down**: Nhấn vào bất kỳ Phân loại nào trên màn Thống kê sẽ tự động chuyển sang màn Sổ giao dịch và áp dụng sẵn toàn bộ bộ lọc tương ứng (Phân loại, Khoảng thời gian, Ngân hàng/Ví, Chi/Thu).
5. **Lưu trữ Cục bộ (Local JSON Storage - No DB) & Cập nhật OTA trong App**:
   - Mọi dữ liệu lưu trữ trực tiếp trên máy dạng file `.json` (`expo-file-system`).
   - Sao lưu & Khôi phục toàn bộ dữ liệu qua 1 file JSON duy nhất; xuất báo cáo ra file **Excel (CSV)** mã hóa **UTF-8 BOM**.
   - Tích hợp nút **"Kiểm tra & Cập nhật ngay"** và **"Xem các bản cập nhật"** ngay trong màn Cài đặt để kiểm tra, tải và áp dụng bản cập nhật OTA trực tiếp trên điện thoại.

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
npx eas-cli update --branch preview --environment preview --platform android --message "Cập nhật tính năng mới"

# (Hoặc nếu bạn đã cài đặt eas-cli global: eas update --branch preview --message "Cập nhật tính năng mới")
```

### Cách kiểm tra & áp dụng bản cập nhật ngay trên điện thoại:

1. Mở ứng dụng **Sổ Chi Tiêu** -> Vào tab **Cài đặt**.
2. Tại mục **Cập nhật ứng dụng (EAS Update OTA)**:
   - Bấm **"Kiểm tra & Cập nhật ngay"**: Ứng dụng sẽ gọi `expo-updates` kiểm tra bản cập nhật mới nhất trên nhánh `preview`, tải về và hỏi bạn khởi động lại app để áp dụng ngay lập tức.
   - Bấm **"Xem các bản cập nhật"**: Xem thông tin bản build hiện tại, mã Update ID, kênh (`channel`), thời gian phát hành và lịch sử các bản cập nhật đã áp dụng trên máy.

> **Lưu ý quan trọng**: Nếu có thay đổi trong thư mục **Native Android** (`modules/notification-listener/android/...` hoặc `app.json` native plugins), bạn cần chạy lại `npx eas-cli@latest build -p android --profile preview` (hoặc `npx expo run:android`) để cập nhật tầng Native. Mọi thay đổi trong `src/` (TypeScript/JavaScript/UI) chỉ cần chạy `eas update`!

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
   - Để đảm bảo hệ điều hành Android (đặc biệt Xiaomi/MIUI, Samsung, Oppo, Vivo) không tắt ngầm dịch vụ đọc thông báo khi bạn vuốt tắt app, hãy bật **"Tự khởi chạy" (Autostart)** và chọn **"Không hạn chế pin" (Unrestricted Battery)** cho ứng dụng Sổ Chi Tiêu.
   - Vào mục **Cài đặt** -> **Danh sách App Ngân hàng & Ví** để kiểm tra các app bạn đang dùng (bao gồm Timo, Viettel Money, MoMo, VCB, MB...) đã được bật chưa.
2. **Thao tác nhanh trên Hàng chờ & Thống kê**:
   - **Nhấn giữ (Long-press)** vào một khoản trong Hàng chờ để bật chế độ chọn nhiều (phân loại hoặc xóa hàng loạt).
   - Tại màn **Thống kê**, bấm vào một mục trên **Biểu đồ Tròn** hoặc danh sách phân loại bên dưới để chuyển ngay sang màn **Sổ giao dịch** với bộ lọc đã được áp dụng tự động.
