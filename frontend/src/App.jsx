import { useState } from 'react'

const App = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);

    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                 <div className="bg-white p-8 rounded-lg shadow-lg">
                   <h1 className="text-3xl font-bold text-blue-600 mb-4">
                     🧬 Lab Plasmid Management
                   </h1>
                   <p className="text-gray-600 mb-4">
                     Tailwind CSS is working!
                   </p>
                   <input
                     type="text"
                     placeholder="Enter plasmid IDs: 5317-1, 4391-1"
                     value = {searchTerm}
                     onChange= {(e) => setSearchTerm(e.target.value)}
                     className="border-2 border-gray-300 py-2 px-4 rounded"
                   />
                    <button
                      onClick={() => {setResults(`Searching for: ${searchTerm}`)}}
                      className="ml-4 bg-blue-500 text-white py-2 px-4 rounded"
                    >
                        Search
                    </button>
                   <p className="mt-4 text-gray-600">
                       You typed: {searchTerm}
                   </p>
                        {results && <p className="mt-4 text-green-600">{results}</p>}

                 </div>
               </div>
};
export default App;
