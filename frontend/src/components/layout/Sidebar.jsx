import BagCard from "../display/BagCards/BagCard.jsx";
import React, {useState} from 'react'
import { Search, Plus, Package, UserX } from 'lucide-react'

{/* Sidebar */}
const Sidebar = ({isOpen, currentView, onAddPlasmid, onAllBagCards, onSearch, onTrack}) => {
    const menuItems = [
        { id: 'bags', icon: <Package size={18} />, text: 'Dashboard' },
        { id: 'search', icon: <Search size={18} />, text: 'Search' },
        { id: 'add', icon: <Plus size={18} />, text: 'Add Plasmids' },
        { id: 'track', icon: <UserX size={18} />, text: 'Track Samples'}
    ];

    const dnaBackground = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='240' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.35'%3E%3C!-- Left strand (sine wave) --%3E%3Cpath d='M 70,0 C 70,20 55,40 50,60 C 45,80 30,100 30,120 C 30,140 45,160 50,180 C 55,200 70,220 70,240' stroke='%234f46e5' stroke-width='2.5' fill='none'/%3E%3C!-- Right strand (opposite phase sine wave) --%3E%3Cpath d='M 30,0 C 30,20 45,40 50,60 C 55,80 70,100 70,120 C 70,140 55,160 50,180 C 45,200 30,220 30,240' stroke='%234f46e5' stroke-width='2.5' fill='none'/%3E%3C!-- Base pair connections --%3E%3Cline x1='30' y1='0' x2='70' y2='0' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='40' y1='30' x2='60' y2='30' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='50' y1='60' x2='50' y2='60' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='60' y1='90' x2='40' y2='90' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='70' y1='120' x2='30' y2='120' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='60' y1='150' x2='40' y2='150' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='50' y1='180' x2='50' y2='180' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='40' y1='210' x2='60' y2='210' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3Cline x1='30' y1='240' x2='70' y2='240' stroke='%23818cf8' stroke-width='1.5' opacity='0.5'/%3E%3C!-- Nucleotides --%3E%3Ccircle cx='30' cy='0' r='3' fill='%234f46e5'/%3E%3Ccircle cx='70' cy='0' r='3' fill='%234f46e5'/%3E%3Ccircle cx='40' cy='30' r='3' fill='%234f46e5'/%3E%3Ccircle cx='60' cy='30' r='3' fill='%234f46e5'/%3E%3Ccircle cx='50' cy='60' r='3' fill='%234f46e5'/%3E%3Ccircle cx='60' cy='90' r='3' fill='%234f46e5'/%3E%3Ccircle cx='40' cy='90' r='3' fill='%234f46e5'/%3E%3Ccircle cx='70' cy='120' r='3' fill='%234f46e5'/%3E%3Ccircle cx='30' cy='120' r='3' fill='%234f46e5'/%3E%3Ccircle cx='60' cy='150' r='3' fill='%234f46e5'/%3E%3Ccircle cx='40' cy='150' r='3' fill='%234f46e5'/%3E%3Ccircle cx='50' cy='180' r='3' fill='%234f46e5'/%3E%3Ccircle cx='40' cy='210' r='3' fill='%234f46e5'/%3E%3Ccircle cx='60' cy='210' r='3' fill='%234f46e5'/%3E%3Ccircle cx='30' cy='240' r='3' fill='%234f46e5'/%3E%3Ccircle cx='70' cy='240' r='3' fill='%234f46e5'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat-y',
        backgroundPosition: 'center 150px',
        backgroundSize: '120px 240px',
        animation: 'dna-scroll 20s linear infinite'
    };

    return (
        <>
            <style>{`
                @keyframes dna-scroll {
                    0% { background-position: center 0px; }
                    100% { background-position: center 200px; }
                }
            `}</style>
            <div
                className={`bg-indigo-50 border-gray-200 -mt-5 pt-5 shadow-lg transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0
                    md:border-r md:min-h-screen ${isOpen ? 'md:w-52' : 'md:w-0'}
                    ${isOpen ? 'border-b' : 'h-0'}
                `}
                style={dnaBackground}
            >
            <nav className={`md:pt-10 md:-mt-5 transition-opacity bg-indigo-50 duration-200 h-full md:h-auto ${isOpen ? 'opacity-100 delay-100' : 'opacity-0'}
                md:space-y-2 md:p-4 md:py-9
                flex md:flex-col gap-2 px-4 py-2
            `}>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={()=> {
                            if (item.id === 'bags') onAllBagCards();
                            if (item.id === 'search') onSearch();
                            if (item.id === 'add') onAddPlasmid();
                            if (item.id === 'track') onTrack();
                        }}
                        className={
                        `flex items-center gap-3 px-3 py-1 md:py-2 md:pl-4 rounded-lg hover:bg-indigo-100 whitespace-nowrap
                        ${currentView === item.id ? 'text-md bg-indigo-200 text-blue-700 hover:bg-indigo-200' : 'text-gray-700'}`
                        }
                    >
                        {item.icon} {item.text}
                    </button>
                ))}
            </nav>
        </div>
        </>
    )
}
export default Sidebar

