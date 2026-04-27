import SwiftUI

struct ChatTopBar: View {
    let showEditButton: Bool
    let onOpenSidebar: () -> Void
    let onNewConversation: () -> Void
    let onClose: (() -> Void)?

    var body: some View {
        HStack {
            Button(action: onOpenSidebar) {
                TablerIcons(.menu2, size: 24, color: Color("TextPrimary"))
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }

            if showEditButton {
                Button {
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
                Button(action: onClose) {
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
