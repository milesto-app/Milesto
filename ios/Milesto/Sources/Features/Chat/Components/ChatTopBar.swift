import SwiftUI

struct ChatTopBar: View {
    let showEditButton: Bool
    let onOpenSidebar: () -> Void
    let onNewConversation: () -> Void
    let onClose: (() -> Void)?

    var body: some View {
        HStack {
            Button {
                Haptics.soft()
                onOpenSidebar()
            } label: {
                TablerIcons(.menu2, size: 24, color: Color("TextPrimary"))
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }

            if showEditButton {
                Button {
                    Haptics.light()
                    withAnimation {
                        onNewConversation()
                    }
                } label: {
                    TablerIcons(.edit, size: 24, color: Color("TextPrimary"))
                        .frame(width: 44, height: 44)
                        .glassEffect(.regular.interactive(), in: .circle)
                }
                .transition(.opacity)
            }

            Spacer()

            if let onClose {
                Button {
                    Haptics.light()
                    onClose()
                } label: {
                    TablerIcons(.x, size: 24, color: Color("TextPrimary"))
                        .frame(width: 44, height: 44)
                        .glassEffect(.regular.interactive(), in: .circle)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
}
