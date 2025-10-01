const ContextMenu = ({ isOpen, position, items, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={onClose}
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm ${item.className || ''}`}
                >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                </div>
            ))}
        </div>
    );
};

export default ContextMenu;