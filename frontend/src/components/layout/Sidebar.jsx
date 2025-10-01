import BagCard from "../display/BagCard.jsx";
import React, {useState} from 'react'
import { Search, Plus, Package } from 'lucide-react'

{/* Sidebar */}

const Sidebar = ({isOpen, currentView, onAddPlasmid, onAllBagCards, onSearch}) => {
    const menuItems = [
        { id: 'bags', icon: <Package size={18} />, text: 'All Bags' },
        { id: 'search', icon: <Search size={18} />, text: 'Search' },
        { id: 'add', icon: <Plus size={18} />, text: 'Add Plasmid' },
    ];
    return (
        <div className={`bg-white border-r border-gray-200 min-h-screen transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? 'w-64 p-4' : 'w-0 p-0'
        }`}>
            <nav className={`space-y-2 transition-opacity duration-200 ${isOpen ? 'opacity-100 delay-100' : 'opacity-0'}`}>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={()=> {
                            if (item.id === 'bags') onAllBagCards();
                            if (item.id === 'search') onSearch();
                            if (item.id === 'add') onAddPlasmid();
                        }}
                        className={
                        `flex items-center gap-3 px-3 py-2  rounded-lg hover:bg-gray-100 whitespace-nowrap
                        ${currentView === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`
                        }
                    >
                        {item.icon} {item.text}
                    </button>
                ))}
            </nav>
        </div>
    )
}
export default Sidebar

