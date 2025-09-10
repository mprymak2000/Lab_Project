import BagCard from "./BagCard.jsx";
import React, {useState} from 'react'

{/* Sidebar */}

const Sidebar = ({isOpen, onAddPlasmid}) => {
    if (!isOpen) return null;
    const [selectedItem, setSelectedItem] = useState('search');
    const [select, setSelect] = useState(false);
    const menuItems = [
        { id: 'search', icon: '🧬', text: 'Search' },
        { id: 'add', icon: '➕', text: 'Add Plasmid' },
        { id: 'bags', icon: '📦', text: 'All Bags' },
    ];
    return (
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
            <nav className="space-y-2">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={()=> {
                            setSelectedItem(item.id)
                        //    if (item.id === 'search') onSearch();
                            if (item.id === 'add') onAddPlasmid();
                            //   if (item.id === 'bags') onAddBags();
                        }}
                        className={
                        `flex items-center gap-3 px-3 py-2  rounded-lg hover:bg-gray-100 
                        ${selectedItem === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`
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

