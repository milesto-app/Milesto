import CryptoKit
import Foundation

enum TTSLanguage: String {
    case en
    case fr

    static func fromLocale() -> TTSLanguage {
        Locale.current.language.languageCode?.identifier == "fr" ? .fr : .en
    }
}

actor TTSCacheService {
    static let shared = TTSCacheService()

    private let cacheDirName = "TTSCache"
    private let maxCacheBytes: Int = 50 * 1024 * 1024
    private let cacheDir: URL

    init() {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let dir = base.appendingPathComponent("TTSCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        cacheDir = dir
    }

    func cachedAudio(text: String, coachId: Int, language: TTSLanguage) -> Data? {
        let key = Self.cacheKey(text: text, coachId: coachId, language: language)
        if let bundleURL = bundledAudioURL(for: key),
           let data = try? Data(contentsOf: bundleURL)
        {
            return data
        }
        let diskURL = cacheDir.appendingPathComponent("\(key).mp3")
        guard let data = try? Data(contentsOf: diskURL) else { return nil }
        try? FileManager.default.setAttributes(
            [.modificationDate: Date()],
            ofItemAtPath: diskURL.path
        )
        return data
    }

    private func bundledAudioURL(for key: String) -> URL? {
        if let url = Bundle.main.url(forResource: key, withExtension: "mp3", subdirectory: cacheDirName) {
            return url
        }
        return Bundle.main.url(forResource: key, withExtension: "mp3")
    }

    func store(audio: Data, text: String, coachId: Int, language: TTSLanguage) {
        let key = Self.cacheKey(text: text, coachId: coachId, language: language)
        if bundledAudioURL(for: key) != nil {
            return
        }
        let url = cacheDir.appendingPathComponent("\(key).mp3")
        try? audio.write(to: url, options: .atomic)
        enforceSizeCap()
    }

    static func cacheKey(text: String, coachId: Int, language: TTSLanguage) -> String {
        let input = "\(text)|\(coachId)|\(language.rawValue)"
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.prefix(8).map { String(format: "%02x", $0) }.joined()
    }

    private func enforceSizeCap() {
        let fm = FileManager.default
        guard let entries = try? fm.contentsOfDirectory(
            at: cacheDir,
            includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey],
            options: .skipsHiddenFiles
        ) else { return }

        var files: [(url: URL, size: Int, mtime: Date)] = []
        var totalBytes = 0
        for url in entries {
            guard let values = try? url.resourceValues(
                forKeys: [.fileSizeKey, .contentModificationDateKey]
            ) else { continue }
            let size = values.fileSize ?? 0
            let mtime = values.contentModificationDate ?? Date.distantPast
            files.append((url, size, mtime))
            totalBytes += size
        }

        guard totalBytes > maxCacheBytes else { return }

        files.sort { $0.mtime < $1.mtime }
        for file in files {
            if totalBytes <= maxCacheBytes { break }
            try? fm.removeItem(at: file.url)
            totalBytes -= file.size
        }
    }
}
