# Chess Review App

A professional chess game analysis mobile application built with React Native.

## 🎯 Features

- **Game Analysis**: Analyze chess games from Chess.com, Lichess, and other platforms
- **Move Classification**: Get detailed move analysis with Brilliant, Great, Best, Mistake, Inaccuracy, and Blunder classifications
- **Accuracy Metrics**: View player accuracy and game statistics
- **Mobile-First Design**: Optimized for mobile devices with responsive UI
- **WebView Integration**: Seamlessly loads the Chess Review web application

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ChessReviewApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install iOS dependencies (macOS only)**
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the App

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

#### Start Metro bundler
```bash
npm start
```

## 📱 App Structure

- **App.tsx**: Main application component with WebView integration
- **WebView**: Loads the Chess Review web application from Railway
- **Responsive Design**: Adapts to light/dark mode and different screen sizes
- **Error Handling**: Graceful error handling for network issues

## 🔧 Configuration

The app loads the Chess Review web application from:
```
https://chesskit-production.up.railway.app
```

## 📦 Dependencies

- **react-native**: Core React Native framework
- **react-native-webview**: WebView component for web app integration
- **react-native-safe-area-context**: Safe area handling for different devices

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

---

**Chess Review** - Professional chess analysis made mobile! ♟️
