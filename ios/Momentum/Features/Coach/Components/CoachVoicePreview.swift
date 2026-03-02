import SwiftUI

struct CoachVoicePreview: View {
    let coachId: Int
    let sampleText: String

    var body: some View {
        HStack(spacing: AppTheme.Spacing.xs) {
            AppText("coach.voice.preview", table: "Coach", style: .caption)
                .color(AppTheme.Colors.textSecondary)

            VoicePlaybackButton(text: sampleText, coachId: coachId)
        }
    }
}
