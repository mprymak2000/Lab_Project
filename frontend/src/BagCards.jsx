const BagCards = () => {
  const bagData = {
    'C20': [
      { id: '5314-1', volume: '20.0mL' },
      { id: '5314-2', volume: '18.0mL' }
    ],
    'C19': [
      { id: '5317-1', volume: '6.0mL' },
      { id: '5332-2', volume: '8.0mL' }
    ],
    'C18': [
      { id: '5182-1', volume: '27.0mL' },
      { id: '5231-1', volume: '18.0mL' }
    ]
  };

  return (
    <>
      {Object.entries(bagData).map(([bagName, plasmids]) => (
        <div key={bagName} className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-2">📦 Bag {bagName}</h3>
          <div className="space-y-1">
            {plasmids.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-mono">{p.id}</span>
                <span className="text-blue-600">{p.volume}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default BagCards;