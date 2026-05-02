import SwiftUI

struct ChatField: View {
    @Binding var text: String
    let placeholder: LocalizedStringKey
    let table: String
    let isFocused: FocusState<Bool>.Binding
    var lineLimit: ClosedRange<Int> = 1 ... 6

    var body: some View {
        TextField(text: $text, axis: .vertical) {
            Text(placeholder, tableName: table)
        }
        .font(Fonts.ui(size: 17, relativeTo: .body))
        .foregroundStyle(Color("TextPrimary"))
        .tint(Color("Brand"))
        .textFieldStyle(.plain)
        .lineLimit(lineLimit)
        .focused(isFocused)
    }
}
