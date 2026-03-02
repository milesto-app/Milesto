import AVFoundation

@MainActor
@Observable
final class AudioStreamService {
    private(set) var isStreaming = false

    private let audioEngine = AVAudioEngine()
    private var converter: AVAudioConverter?
    var onAudioCaptured: ((Data) -> Void)?

    func requestPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    func startStreaming() throws {
        let inputNode = audioEngine.inputNode
        let hardwareFormat = inputNode.outputFormat(forBus: 0)

        let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16000,
            channels: 1,
            interleaved: true
        )!

        converter = AVAudioConverter(from: hardwareFormat, to: targetFormat)

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: hardwareFormat) { [weak self] buffer, _ in
            guard let self, let converter = self.converter else { return }

            let frameCount = AVAudioFrameCount(
                Double(buffer.frameLength) * 16000.0 / hardwareFormat.sampleRate
            )
            guard frameCount > 0 else { return }

            guard let outputBuffer = AVAudioPCMBuffer(
                pcmFormat: targetFormat,
                frameCapacity: frameCount
            ) else { return }

            var error: NSError?
            converter.convert(to: outputBuffer, error: &error) { _, outStatus in
                outStatus.pointee = .haveData
                return buffer
            }

            guard error == nil, outputBuffer.frameLength > 0 else { return }

            let byteCount = Int(outputBuffer.frameLength) * 2
            guard let int16Data = outputBuffer.int16ChannelData else { return }
            let data = Data(bytes: int16Data[0], count: byteCount)

            Task { @MainActor in
                self.onAudioCaptured?(data)
            }
        }

        try audioEngine.start()
        isStreaming = true
    }

    func stopStreaming() {
        audioEngine.inputNode.removeTap(onBus: 0)
        audioEngine.stop()
        converter = nil
        isStreaming = false
    }
}
