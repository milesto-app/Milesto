import Foundation

@MainActor
protocol LocalDataPurging: AnyObject {
    func purgeLocalData() throws
}
