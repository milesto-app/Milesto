import SwiftUI

struct IntakeLoadingView: View {
    var body: some View {
        ProgressView()
            .controlSize(.large)
            .tint(Color("Brand"))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.regularMaterial)
            .ignoresSafeArea()
    }
}
