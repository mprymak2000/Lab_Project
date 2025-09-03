import {useEffect, useState} from "react";

const BagCards = () => {

    // Commented out API call for now - will add back later
    // const [bagData, setBagData] = useState({});
    // useEffect(() => {
    //     fetch('http://localhost:5000/api/recent-bags')
    //     .then(res => res.json())
    //     .then(data => setBagData(data));
    // }, []);

    // Static bag data for development
    const bagData = {
        'A1': [
            { id: '1247-3', volume: '15mL' },
            { id: '2891-7', volume: '12mL' },
            { id: '3456-12', volume: '8mL' }
        ],
        'B2': [
            { id: '4782-1', volume: '20mL' },
            { id: '1834-15', volume: '10mL' },
            { id: '3927-4', volume: '25mL' }
        ],
        'C3': [
            { id: '2156-8', volume: '18mL' },
            { id: '4893-2', volume: '6mL' },
            { id: '1672-19', volume: '14mL' },
            { id: '3245-6', volume: '22mL' }
        ],
        'D4': [
            { id: '4567-11', volume: '16mL' },
            { id: '2789-3', volume: '9mL' }
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