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
        Button(action: onSelect) {
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
            .contentShape(Rectangle())
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color("Brand"), lineWidth: 2)
                    .opacity(isSelected ? 1 : 0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
            )
        }
        .buttonStyle(PressableCardStyle())
    }
}

#Preview {
    VStack(spacing: 16) {
        CoachCard(
            personality: .motivateur,
            isSelected: true,
            onSelect: {}
        )

        CoachCard(
            personality: .zen,
            isSelected: false,
            onSelect: {}
        )
    }
    .padding()
    .background(Color("BackgroundBase"))
}
