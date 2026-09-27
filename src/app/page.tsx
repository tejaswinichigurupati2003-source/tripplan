import { createDecision } from './actions'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Decision Room</h1>
        <p className="text-gray-500 mb-6">Create a new collaborative group trip decision.</p>

        <form action={createDecision} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Trip Name</label>
            <input 
              type="text" 
              name="title" 
              id="title" 
              required 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="E.g., Summer Vacation 2026"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              name="description" 
              id="description" 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Where are we going?"
            />
          </div>
          <div>
            <label htmlFor="creatorName" className="block text-sm font-medium text-gray-700">Your Name</label>
            <input 
              type="text" 
              name="creatorName" 
              id="creatorName" 
              required 
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Alice"
            />
          </div>
          <button 
            type="submit" 
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Decision Room
          </button>
        </form>
      </div>
    </main>
  )
}
