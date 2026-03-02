import AVFoundation
import Observation

@MainActor
@Observable
final class PCMAudioPlayerService {
    private(set) var isPlaying = false

    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private let format = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: 24000,
        channels: 1,
        interleaved: true
    )!

    init() {
        audioEngine.attach(playerNode)
        audioEngine.connect(playerNode, to: audioEngine.mainMixerNode, format: format)
    }

    func start() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)
        try audioEngine.start()
        playerNode.play()
        isPlaying = true
    }

    func enqueueChunk(data: Data) {
        let frameCount = UInt32(data.count / 2)
        guard frameCount > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)
        else { return }

        buffer.frameLength = frameCount
        data.withUnsafeBytes { rawBuffer in
            guard let src = rawBuffer.baseAddress else { return }
            memcpy(buffer.int16ChannelData![0], src, data.count)
        }

        playerNode.scheduleBuffer(buffer)
    }

    func stop() {
        playerNode.stop()
        audioEngine.stop()
        isPlaying = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func interrupt() {
        playerNode.stop()
        isPlaying = false
    }
}
