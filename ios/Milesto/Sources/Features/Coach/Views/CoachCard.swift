import SwiftUI

private struct PressableCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct CoachCard: View {
    let personality: CoachPersonality
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 24, style: .continuous)

        Button {
            if !isSelected {
                Haptics.selection()
            }
            onSelect()
        } label: {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color("Brand").opacity(0.1))
                        .frame(width: 56, height: 56)

                    TablerIcons(personality.icon, size: 28, color: Color("Brand"))
                }

                VStack(alignment: .leading, spacing: 4) {
                    AppText(verbatim: personality.title, style: .headline)

                    AppText(verbatim: personality.description, style: .subheadline)
                }

                Spacer()

                TablerIcons(.circleCheck, size: 28, color: Color("Brand"))
                    .opacity(isSelected ? 1 : 0)
                    .scaleEffect(isSelected ? 1 : 0.5)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
            }
            .padding(16)
            .background(Color("BackgroundSecondary"), in: shape)
            .contentShape(shape)
            .overlay(
                shape
                    .stroke(Color("Brand"), lineWidth: 2)
                    .opacity(isSelected ? 1 : 0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
            )
        }
        .buttonStyle(PressableCardStyle())
    }
}
